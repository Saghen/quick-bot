import Spotify from 'spotify-web-api-node'
import { AudioGetter, UrlChecker } from '../commands/play'
import { QueueItem } from '../lib/queue'
import ytsr from 'ytsr'

import { getAudio as getYTAudio } from './youtube'

const spotify = new Spotify({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_SECRET,
  redirectUri: process.env.REDIRECT_URI
})

function isTrackUrl(url: URL) {
  return url.pathname.startsWith('/track')
}

function isPlaylistUrl(url: URL) {
  return url.pathname.startsWith('/playlist')
}

type SimplifiedTrack = Pick<QueueItem, 'title' | 'artists'>
function processTrack(track: SpotifyApi.TrackObjectSimplified): SimplifiedTrack {
  return { title: track.name, artists: track.artists.map((artist) => artist.name) }
}

async function getTrackInfos(url: URL): Promise<SimplifiedTrack[]> {
  if (!isValidUrl(url)) throw new Error('A valid url must be provided')
  if (isTrackUrl(url)) {
    const track = await spotify.getTrack(url.pathname.slice('/track/'.length)).then((res) => res.body)
    return [processTrack(track)]
  }
  const items = await spotify.getPlaylistTracks(url.pathname.slice('/playlist/'.length)).then((res) => res.body.items)
  return items.map((item) => processTrack(item.track))
}

export const isValidUrl: UrlChecker = (url) => isTrackUrl(url) || isPlaylistUrl(url)

export const getAudio: AudioGetter = async (url: URL): Promise<QueueItem[]> => {
  const trackInfos = await getTrackInfos(url)
  return Promise.all(
    trackInfos.map(({ artists, title }) =>
      ytsr(`${artists.join(' ')} - ${title} Audio`).then(async (res) => {
        const items = res.items.filter((item) => item.type === 'video') as ytsr.Video[]
        const { name, url } = await getYTAudio(items[0].url).then((items) => items[0])
        return { name, url, artists, title } as QueueItem
      })
    )
  )
}
