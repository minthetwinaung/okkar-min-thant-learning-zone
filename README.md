# 🎒 Okkar Min Thant Learning Zone

A free, colourful learning website for kindergarten children, with big pictures, talking words, songs, painting, coding games and a family photo album.

**Live site:** https://okkar-min-thant-learning-zone.netlify.app

## What's inside

| Section | What children do |
|---|---|
| 📚 **Lessons** | English, Myanmar, Maths and Science units with picture cards, voice, narrated "Watch" lessons, practice questions and games |
| 🎵 **Video Songs** | Famous English kids' songs (ABC, numbers, colours, nursery rhymes, movement) |
| 🎨 **Art Studio** | Paint and colour pages (vehicles, heroes, toys, rainbow) with colour-word missions, plus drawing-tutorial videos |
| 🤖 **Code Lab** | Programming-logic games for KG: robot path, fix the bug, patterns, and if/then rules |
| 📸 **Family Album** | Photo album with tappable English words, an auto-playing family movie, and a photo memory game |

Stars and progress are saved only on each child's own device. Nothing is sent anywhere.

## How it works

It's a plain static site with no build step, no server and no libraries. Open `index.html` in a browser, or host the folder anywhere.

```
index.html        page shell
css/style.css     all styles
js/config.js      site title, voice settings, lesson videos
js/data.js        lesson units (words, pictures, questions)
js/songs.js       video song list
js/art.js         Art Studio video list
js/family.js      family photos, captions, words and videos
js/app.js         the app (router, voice, games, studio, album)
audio/            recorded Myanmar voice clips (mp3)
img/              pictures and family photos
```

## Editing

- **Title and settings:** `js/config.js`
- **Songs or art videos:** `js/songs.js` and `js/art.js`. Each entry is a YouTube video ID.
- **Family photos:** put the photo in `img/family/` and a small copy in `img/family/t/`, then add a line in `js/family.js`.
- **Family videos:** add `{ t: 'Title', file: 'videos/clip.mp4' }` for a short clip, or `{ t: 'Title', yt: 'VIDEO_ID' }` for an unlisted YouTube video, in `js/family.js`.

## Voice

English uses the device's built-in voice (Chrome and Edge sound best). Myanmar words play recorded clips from `audio/`.

## Deploy

Netlify: drag this folder onto **Deploys** in the Netlify project. You can also connect the GitHub repo in Netlify so every push updates the site automatically.
