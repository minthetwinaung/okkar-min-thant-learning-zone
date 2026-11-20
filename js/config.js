/* ===== Okkar Min Thant Learning Zone settings (you can edit this file) =====
   1) Add YouTube videos to any lesson:
      videos: { 'eng-oct': [ { title:'Special sounds', youtube:'PASTE_VIDEO_ID_HERE' } ] }
      (The video ID is the part after v= in the YouTube link.)
   2) Use your own recorded voice (mp3) instead of the computer voice:
      set useAudioFiles:true and put files in the audio folder (see README.txt).
*/
window.KGCONFIG = {
  siteTitle: 'Okkar Min Thant Learning Zone',
  schoolName: '',
  useAudioFiles: false,      // true = also use mp3 files for English cards
  myanmarAudio: true,        // Myanmar words play the recorded Burmese voice in the audio folder (works on every device)
  // Songs shown under "More videos" in each lesson's Watch tab.
  // The full song list (Sing-along Songs page) is in js/songs.js.
  videos: {
    'eng-sept': [
      { title: 'Do You Like Broccoli Ice Cream?', by: 'Super Simple Songs', youtube: 'frN3nvhIHUk' },
      { title: 'Yes Yes Vegetables & Fruits', by: 'Cocomelon', youtube: 'Lf39jGmoqNA' },
      { title: 'Apples & Bananas', by: 'Super Simple Songs', youtube: 'r5WLXZspD1M' }
    ],
    'eng-more': [
      { title: 'Yes Yes Vegetables & Fruits', by: 'Cocomelon', youtube: 'Lf39jGmoqNA' },
      { title: 'Itsy Bitsy Spider', by: 'Twinkle Little Songs', youtube: 'w_lCi8U49mY' },
      { title: 'Do You Like Broccoli Ice Cream?', by: 'Super Simple Songs', youtube: 'frN3nvhIHUk' }
    ],
    'eng-oct': [
      { title: 'Digraphs Song: sh, ch, th, wh', by: 'Jack Hartmann', youtube: 'NK8_Tvu6bJk' },
      { title: 'The Digraph sh', by: 'Jack Hartmann', youtube: 'xrO75zfW0HY' },
      { title: 'The Digraph ch', by: 'Jack Hartmann', youtube: '9Jdjj-uet34' },
      { title: 'The Digraph th', by: 'Jack Hartmann', youtube: 'E5cwtnp3VQ4' },
      { title: 'The Digraph wh', by: 'Jack Hartmann', youtube: 'Qf8frg1Qdqc' },
      { title: 'Old MacDonald Had a Farm', by: 'Super Simple Songs', youtube: '_6HzoUcx3eo' },
      { title: 'Walking in the Jungle', by: 'Super Simple Songs', youtube: 'GoSq-yZcJ-4' },
      { title: 'Baby Shark Dance', by: 'Pinkfong', youtube: 'XqZsoesa55w' },
      { title: 'Head Shoulders Knees & Toes', by: 'Super Simple Songs', youtube: 'ZanHgPprl-0' }
    ],
    'sci-oct': [
      { title: 'Kindness Song: Be Kind', by: 'Miss Nina', youtube: '5qUJ5Fewojo' },
      { title: 'Clean Up Song', by: 'Super Simple Songs', youtube: 'SFE0mMWbA-Y' },
      { title: "If You're Happy", by: 'Super Simple Songs', youtube: 'l4WNrvVjiTw' }
    ],
    'mat-sept': [
      { title: 'Counting 1 to 10', by: 'The Singing Walrus', youtube: 'DR-cfDsHCGA' },
      { title: 'Five Little Ducks', by: 'Super Simple Songs', youtube: 'pZw9veQ76fo' },
      { title: 'Friends of 10', by: 'Jack Hartmann', youtube: '73av5oijolU' },
      { title: 'I Know My Number Bonds to 10', by: 'Jack Hartmann', youtube: 'lD9tjBUiXs0' }
    ],
    'mat-oct': [
      { title: "Let's Count to 20", by: 'Dream English Kids', youtube: '0VLxWIHRD4E' },
      { title: 'What Numbers Make 10?', by: 'Jack Hartmann', youtube: 'YBkpC29_GaI' },
      { title: 'Move and Add, Add and Move', by: 'Jack Hartmann', youtube: 'uONIJ5TQ2DA' },
      { title: "Let's Get Fit: Count to 100", by: 'Jack Hartmann', youtube: '0TgLtF3PMOc' },
      { title: 'Five Little Monkeys', by: 'Little BoBo', youtube: 'b0NHrFNZWh0' }
    ]
  }
};
