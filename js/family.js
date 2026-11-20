/* ===== Family Album (you can edit this file) =====
   PHOTOS: put a big photo in img/family/ and a small copy in img/family/t/ (same name),
           then add a line below. "words" are English words children can tap and hear.
   VIDEOS: two ways —
     1) Short phone clip (under ~40 MB, .mp4): put it in a folder called "videos" next to index.html,
        then add  { t: 'Fun at the beach', file: 'videos/beach.mp4' },
     2) Longer video: upload it to YouTube as "Unlisted", then add  { t: 'Our trip', yt: 'VIDEO_ID' },
*/
window.KGFAMILY = {
  groups: [
    { id: 'beach', name: 'Beach days', emoji: '🏖️', color: '#00b4d8' },
    { id: 'city', name: 'Bangkok', emoji: '🏙️', color: '#ff9f1c' }
  ],
  photos: [
    { f: 'p01.jpg', g: 'beach', cap: 'Looking at the clear blue sea', words: ['sea', 'boat', 'stones', 'backpack'] },
    { f: 'p02.jpg', g: 'beach', cap: 'Climbing on the big rocks', words: ['rock', 'water', 'pier', 'sky'] },
    { f: 'p03.jpg', g: 'beach', cap: 'Splash! Water fun on the sand', words: ['water', 'palm tree', 'sand', 'smile'] },
    { f: 'p04.jpg', g: 'beach', cap: 'Holding hands by the sea', words: ['waves', 'boat', 'footprints'] },
    { f: 'p05.jpg', g: 'beach', cap: 'Playing in the little waves', words: ['wave', 'sand', 'bubbles'] },
    { f: 'p06.jpg', g: 'beach', cap: 'Wet and happy!', words: ['wet', 'sand', 'umbrella'] },
    { f: 'p07.jpg', g: 'beach', cap: 'The water feels cool', words: ['shirt', 'waves', 'cool'] },
    { f: 'p08.jpg', g: 'beach', cap: 'Making a sand ball', words: ['sand', 'hand', 'round'] },
    { f: 'p09.jpg', g: 'beach', cap: 'Watching the waves come in', words: ['waves', 'boat', 'beach'] },
    { f: 'p10.jpg', g: 'beach', cap: 'Here comes a wave!', words: ['wave', 'splash', 'city'] },
    { f: 'p11.jpg', g: 'beach', cap: 'Sandy legs and toes', words: ['legs', 'toes', 'sand'] },
    { f: 'p12.jpg', g: 'beach', cap: 'Building with wet sand', words: ['build', 'hands', 'sand'] },
    { f: 'p13.jpg', g: 'beach', cap: 'Lying on the beach', words: ['lie down', 'beach', 'feet'] },
    { f: 'p14.jpg', g: 'beach', cap: 'Digging a hole in the sand', words: ['dig', 'sea', 'yellow'] },
    { f: 'p15.jpg', g: 'city', cap: 'The big BANGKOK letters', words: ['Bangkok', 'letters', 'car', 'light'] },
    { f: 'p16.jpg', g: 'city', cap: 'Walking together on the glass bridge', words: ['bridge', 'glass', 'red', 'walk'] }
  ],
  videos: [
    // { t: 'Fun at the beach', file: 'videos/beach.mp4' },
    // { t: 'Our Bangkok trip', yt: 'VIDEO_ID' },
  ]
};
