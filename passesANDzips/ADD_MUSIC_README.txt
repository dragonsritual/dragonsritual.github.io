DRAGON RADIO PUBLIC 01 — ADD MUSIC

1. Put approved MP3 files in:
   radio/audio/

2. Put optional JPG/PNG artwork in:
   radio/artwork/

3. Edit radio/library.json and add tracks like this:

{
  "station": "Dragon Radio",
  "tracks": [
    {
      "title": "Track Name",
      "artist": "Artist Name",
      "src": "/radio/audio/artist-track.mp3",
      "artwork": "/radio/artwork/artist-cover.jpg"
    }
  ]
}

4. Commit the changed files to GitHub main. The public station refreshes library.json when listeners open it.

RIGHTS NOTE:
Only upload tracks you have permission/license to stream publicly. Keep the artist's written permission and submission details in your private records.
