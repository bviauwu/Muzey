import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { initialSongs } from "./songs";
import "./style.css";
import { Shuffle, Play, Volume2, ChevronDown, ChevronUp } from "lucide-react";

const FAV_KEY = "musicAppFavorites";
const RECENT_KEY = "musicAppRecentSongs";
const TELEPORT_HISTORY_KEY = "muzeyLastPlayed";
const TELEPORT_USED_KEY = "muzeyTeleportUsed";
const PLAYLIST_KEY = "muzeyPlaylists";
const RECENT_PLAYLISTS_KEY = "muzeyRecentPlaylists";
const YOUTUBE_API_KEY = "AIzaSyBLQxXwhMmtfnNIpUhP82qSY15SEvrMXQU";
const readArray = (key) => { try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const getYouTubeId = (url = "") => {
  try { const u = new URL(url); if (u.hostname === "youtu.be") return u.pathname.slice(1); if (u.pathname === "/watch") return u.searchParams.get("v"); const m = u.pathname.match(/^\/(embed|shorts)\/([^/]+)/); return m?.[2] || null; } catch { return null; }
};
const coverFor = (song) => song.cover || `https://img.youtube.com/vi/${getYouTubeId(song.youtubeUrl)}/hqdefault.jpg`;
const timeText = (seconds) => { if (!Number.isFinite(seconds)) return "0:00"; return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}`; };

function App() {
  const [songs, setSongs] = useState(initialSongs.map(s => ({...s, cover: coverFor(s)})));
  const [favorites, setFavorites] = useState(() => readArray(FAV_KEY).map(String));
  const [recents, setRecents] = useState(() => readArray(RECENT_KEY).map(String));
  const [lastPlayed, setLastPlayed] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem(TELEPORT_HISTORY_KEY) || "{}"
    );
  } catch {
    return {};
  }
});

const [teleportUsed, setTeleportUsed] = useState(() =>
  readArray(TELEPORT_USED_KEY).map(String)
);
  const [playlists, setPlaylists] = useState(() => readArray(PLAYLIST_KEY));
  const [recentPlaylists, setRecentPlaylists] = useState(
  () => readArray(RECENT_PLAYLISTS_KEY)
);
  const [view, setView] = useState("home");
  const [sidebarWidth, setSidebarWidth] = useState(() => {
  return Number(localStorage.getItem("muzeySidebarWidth")) || 230;
});

const sidebarResizing = useRef(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [youtubeOpen, setYoutubeOpen] = useState(true);
  const [context, setContext] = useState(null);
  const [toast, setToast] = useState("");
  const [pickerSong, setPickerSong] = useState(null);
  const [playlistName, setPlaylistName] = useState("");
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);
  const playerRef = useRef(null);
  const [playQueue, setPlayQueue] = useState([]);
const playQueueRef = useRef([]);
const currentSongIdRef = useRef(null);
  const currentSongRef = useRef(null);
  const audioRef = useRef(null);
const fallbackTimerRef = useRef(null);
const playbackIdRef = useRef(0);
const manuallyPausedRef = useRef(false);
const audioSourceRef = useRef("youtube");
const playFallbackMp3Ref = useRef(null);

const [audioSource, setAudioSource] = useState("youtube");
  const [ytReady, setYtReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMetadata() {
      const updated = await Promise.all(songs.map(async song => {
        try {
          const id = getYouTubeId(song.youtubeUrl);
          if (!id) return song;
          const url = new URL("https://www.googleapis.com/youtube/v3/videos");
          url.searchParams.set("part", "snippet"); url.searchParams.set("id", id); url.searchParams.set("key", YOUTUBE_API_KEY);
          const response = await fetch(url);
          if (!response.ok) return song;
          const data = await response.json(); const snippet = data.items?.[0]?.snippet;
          if (!snippet) return song;
          const title = (
  snippet.title.match(/"([^"]+)"|'([^']+)'/)?.slice(1).find(Boolean) ||
  snippet.title
    .replace(/^.*?\s[-—]\s/, "")
)
  // Usuwa opisy typu Performance Practice Part 2.
  .replace(/^.*?\bperformance\s+practice(?:\s+part\s+\d+)?\s*[.:]\s*/i, "")

  // Usuwa Official Video, Official Music Video i Remix
  .replace(/\s*[\[(]\s*(?:official\s+)?(?:music\s+)?video\s*[\])]/gi, "")
  .replace(/\s*[\[(]\s*remix\s*[\])]/gi, "")

  .trim();
          return {...song, title, artist: snippet.channelTitle, cover: snippet.thumbnails?.high?.url || coverFor(song)};
        } catch { return song; }
      }));
      if (!cancelled) setSongs(updated);
    }
    loadMetadata();
    return () => { cancelled = true; };
  }, []);
useEffect(() => {
  const audio = new Audio();
  audioRef.current = audio;

  audio.onplay = () => setPlaying(true);
  audio.onpause = () => setPlaying(false);

  audio.onended = () => {
    setPlaying(false);
  };

  return () => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audioRef.current = null;

    clearTimeout(fallbackTimerRef.current);
  };
}, []);
  useEffect(() => { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(RECENT_KEY, JSON.stringify(recents)); }, [recents]);
  useEffect(() => {
  localStorage.setItem(
    TELEPORT_HISTORY_KEY,
    JSON.stringify(lastPlayed)
  );
}, [lastPlayed]);

useEffect(() => {
  localStorage.setItem(
    TELEPORT_USED_KEY,
    JSON.stringify(teleportUsed)
  );
}, [teleportUsed]);
  useEffect(() => { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists)); }, [playlists]);
  useEffect(() => {
  localStorage.setItem(
    RECENT_PLAYLISTS_KEY,
    JSON.stringify(recentPlaylists)
  );
}, [recentPlaylists]);
  useEffect(() => {
    const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(script);
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("youtubePlayer", { width: "320", height: "180", videoId: "", playerVars: { playsinline: 1 }, events: {
        onReady: e => { setYtReady(true); e.target.setVolume(50); },
       onStateChange: e => {
  if (audioSourceRef.current === "mp3") return;

  if (e.data === window.YT.PlayerState.PLAYING) {
    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
    setPlaying(true);
  }

  if (e.data === window.YT.PlayerState.PAUSED) {
    setPlaying(false);
  }

  if (e.data === window.YT.PlayerState.ENDED) {
    setPlaying(false);
    nextSong();
  }
},
      onError: () => {
  clearTimeout(fallbackTimerRef.current);

  if (manuallyPausedRef.current) return;
  if (audioSourceRef.current === "mp3") return;

  const song = currentSongRef.current;

  if (song && audioRef.current) {
    playFallbackMp3Ref.current?.(song);
  }
}
      }});
    };
    return () => { if (playerRef.current?.destroy) playerRef.current.destroy(); };
  }, []);
  useEffect(() => {
  if (!ytReady || !playerRef.current) return;

  let animationId;
  let lastUpdate = 0;

  function animate(timestamp) {
    if (timestamp - lastUpdate >= 50) {
      try {
        const player = playerRef.current;

        const audio = audioRef.current;

const d = audioSource === "mp3"
  ? audio?.duration || 0
  : player.getDuration();

const t = audioSource === "mp3"
  ? audio?.currentTime || 0
  : player.getCurrentTime();

        setDuration(d || 0);
        setElapsed(t || 0);

        setProgress(d ? (t / d) * 100 : 0);
      } catch {}

      lastUpdate = timestamp;
    }

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(animationId);
}, [ytReady, audioSource]);
  useEffect(() => {
  // Głośność YouTube
  if (ytReady && playerRef.current) {
    playerRef.current.setVolume(volume * 100);
  }

  // Głośność MP3
  if (audioRef.current) {
    audioRef.current.volume = volume;
  }
}, [volume, ytReady]);
  useEffect(() => { const close = () => setContext(null); window.addEventListener("click", close); return () => window.removeEventListener("click", close); }, []);

  const filtered = useMemo(() => {
    let list = [...songs]; const q = search.trim().toLowerCase();
    if (view === "favorites") list = list.filter(s => favorites.includes(String(s.id)));
    else if (view === "playlist" && activePlaylist) {
  const selectedPlaylist = playlists.find(
    p => String(p.id) === String(activePlaylist.id)
  );
  list = (selectedPlaylist?.songIds || [])
    .map(id =>
      songs.find(s => String(s.id) === String(id))
    )
    .filter(Boolean);
}
    else if (view === "library") list = list.filter(s => recents.includes(String(s.id)));
    if (q) list = list.filter(s => `${s.title} ${s.artist}`.toLowerCase().includes(q));
    return list;
  }, [songs, search, view, favorites, activePlaylist, recents, playlists]);
  const newestSongs = useMemo(() => {
  return [...songs]
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 8);
}, [songs]);

  function notify(message) { setToast(message); window.setTimeout(() => setToast(""), 2200); }
  function startPlaylist(playlist, shuffle = false) {
  const songIds = playlist.songIds || [];

  let playlistSongs = songIds
    .map(id => songs.find(song => String(song.id) === String(id)))
    .filter(Boolean);

  if (playlistSongs.length === 0) {
    notify("Ta playlista jest pusta!");
    return;
  }

  if (shuffle) {
    playlistSongs = [...playlistSongs];

    for (let i = playlistSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlistSongs[i], playlistSongs[j]] =
        [playlistSongs[j], playlistSongs[i]];
    }
  }

  playQueueRef.current = playlistSongs;
  setPlayQueue(playlistSongs);

  const playlistId = String(playlist.id);

  setRecentPlaylists(old => [
    playlistId,
    ...old.filter(id => String(id) !== playlistId)
  ].slice(0, 6));

  playSong(playlistSongs[0]);

  notify(
    shuffle
      ? "⤨ Odtwarzanie losowe playlisty"
      : "▶ Odtwarzanie playlisty"
  );
}
  function playSong(song) {
  if (!song) return;
  manuallyPausedRef.current = false;
audioSourceRef.current = "youtube";
  setLastPlayed(old => ({
  ...old,
  [String(song.id)]: Date.now()
}));
  currentSongIdRef.current = String(song.id);
currentSongRef.current = song;
  setCurrent(song);
  setPlaying(true);

  setRecents(old => [
    String(song.id),
    ...old.filter(id => id !== String(song.id))
  ].slice(0, 8));

  // Zapisz ostatnio słuchaną playlistę
  if (view === "playlist" && activePlaylist) {
    const playlistId = String(activePlaylist.id);

    setRecentPlaylists(old => [
      playlistId,
      ...old.filter(id => String(id) !== playlistId)
    ].slice(0, 6));
  }

  clearTimeout(fallbackTimerRef.current);

playbackIdRef.current += 1;
const playbackId = playbackIdRef.current;

audioRef.current?.pause();

setAudioSource("youtube");
setElapsed(0);
setProgress(0);
setDuration(0);

const videoId = getYouTubeId(song.youtubeUrl);

if (ytReady && playerRef.current && videoId) {
  playerRef.current.loadVideoById(videoId);

  if (song.mp3Url) {
    fallbackTimerRef.current = setTimeout(() => {
      if (
  playbackIdRef.current !== playbackId ||
  manuallyPausedRef.current ||
  audioSourceRef.current === "mp3"
) return;

      const state = playerRef.current?.getPlayerState();

      if (state !== window.YT.PlayerState.PLAYING) {
        playFallbackMp3(song);
      }
    }, 8000);
  }
} else {
  playFallbackMp3(song);
}
}
function playFallbackMp3(song) {
  if (manuallyPausedRef.current) return;
if (audioSourceRef.current === "mp3") return;
  if (!song?.mp3Url || !audioRef.current) {
    notify("Nie udało się odtworzyć utworu.");
    setPlaying(false);
    return;
  }

  clearTimeout(fallbackTimerRef.current);

  const audio = audioRef.current;

  if (playerRef.current && ytReady) {
    playerRef.current.pauseVideo();
  }
audioSourceRef.current = "mp3";
setAudioSource("mp3");

  audio.pause();
  audio.src = song.mp3Url;
  audio.currentTime = 0;
  audio.volume = volume;

  audio.play()
    .then(() => {
      setPlaying(true);
      notify("Odtwarzanie z pliku MP3");
    })
    .catch(() => {
      setPlaying(false);
      notify("Nie udało się odtworzyć MP3.");
    });
}
playFallbackMp3Ref.current = playFallbackMp3;
function musicTeleport(onlyNeverPlayed = false) {
  if (songs.length === 0) {
    notify("Brak piosenek do teleportowania!");
    return;
  }

  // Nie losujemy aktualnie odtwarzanej piosenki
  let candidates = songs.filter(
    song => String(song.id) !== String(current?.id)
  );

  if (onlyNeverPlayed) {
    candidates = candidates.filter(
      song => !lastPlayed[String(song.id)]
    );

    if (candidates.length === 0) {
      notify("Wszystkie piosenki były już odtwarzane!");
      return;
    }
  } else {
    // Wybierz 30% najdawniej słuchanych piosenek
    candidates.sort((a, b) => {
      const timeA = lastPlayed[String(a.id)] || 0;
      const timeB = lastPlayed[String(b.id)] || 0;
      return timeA - timeB;
    });

    candidates = candidates.slice(
      0,
      Math.max(1, Math.ceil(candidates.length * 0.3))
    );
  }

  // Unikaj powtórek, dopóki nie wyczerpią się kandydaci
  let available = candidates.filter(
    song => !teleportUsed.includes(String(song.id))
  );

  if (available.length === 0) {
    available = candidates;
    setTeleportUsed([]);
  }

  const randomIndex = Math.floor(
    Math.random() * available.length
  );

  const selectedSong = available[randomIndex];

  setTeleportUsed(old => [
    ...old.filter(id => id !== String(selectedSong.id)),
    String(selectedSong.id)
  ]);

  // Teleport uruchamia pojedynczy utwór,
  // więc czyścimy wcześniejszą kolejkę playlisty
  playQueueRef.current = [];
  setPlayQueue([]);

  playSong(selectedSong);

  notify(`🪐 Teleportowano do: ${selectedSong.title}`);
}
  function nextSong() {
  const queue = playQueueRef.current;

  if (queue.length > 0) {
    const index = queue.findIndex(
      song => String(song.id) === String(currentSongIdRef.current)
    );

    const nextIndex = (index + 1) % queue.length;

    playSong(queue[nextIndex]);
    return;
  }

  if (!songs.length) return;

  const index = songs.findIndex(
    song => String(song.id) === String(currentSongIdRef.current)
  );

  playSong(songs[(index + 1) % songs.length]);
}
  function previousSong() {
  const queue = playQueueRef.current;

  if (queue.length > 0) {
    const index = queue.findIndex(
      song => String(song.id) === String(currentSongIdRef.current)
    );

    const previousIndex =
      (index - 1 + queue.length) % queue.length;

    playSong(queue[previousIndex]);
    return;
  }

  if (!songs.length) return;

  const index = songs.findIndex(
    song => String(song.id) === String(currentSongIdRef.current)
  );

  playSong(songs[(index - 1 + songs.length) % songs.length]);
}
  function toggleFavorite(song) {
    const id = String(song.id);
    setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
    notify(favorites.includes(id) ? "♡ Usunięto z ulubionych!" : "♥ Dodano do ulubionych!");
  }
  function deletePlaylist() {
  if (!activePlaylist) return;

  const playlistId = String(activePlaylist.id);

  setPlaylists(old =>
    old.filter(p => String(p.id) !== playlistId)
  );

  setRecentPlaylists(old =>
    old.filter(id => String(id) !== playlistId)
  );

  // Wyczyść kolejkę playlisty
  playQueueRef.current = [];
  setPlayQueue([]);

  setDeletePlaylistOpen(false);
  setActivePlaylist(null);
  setView("home");
  setSearch("");

  notify("Playlista została usunięta!");
}
  function createPlaylist() {
  const name = playlistName.trim();

  if (!name) {
    notify("Wpisz nazwę playlisty!");
    return;
  }

  const newPlaylist = {
    id: `${Date.now()}`,
    name: name,
    songIds: []
  };

  setPlaylists(old => [...old, newPlaylist]);

  setPlaylistName("");
  setCreatePlaylistOpen(false);

  notify("Utworzono playlistę!");
}
const draggedSongId = useRef(null);

function reorderPlaylistSongs(targetSongId) {
  if (!activePlaylist || draggedSongId.current === null) return;

  const draggedId = String(draggedSongId.current);
  const targetId = String(targetSongId);

  if (draggedId === targetId) return;

  setPlaylists(old =>
    old.map(playlist => {
      if (String(playlist.id) !== String(activePlaylist.id)) {
        return playlist;
      }

      const songIds = [...(playlist.songIds || [])];

      const fromIndex = songIds.findIndex(
        id => String(id) === draggedId
      );

      const toIndex = songIds.findIndex(
        id => String(id) === targetId
      );

      if (fromIndex === -1 || toIndex === -1) {
        return playlist;
      }

      const [movedSong] = songIds.splice(fromIndex, 1);
      songIds.splice(toIndex, 0, movedSong);

      return {
        ...playlist,
        songIds
      };
    })
  );
}
  function addToPlaylist(playlistId, song) {
  setPlaylists(old =>
    old.map(playlist => {
      if (String(playlist.id) !== String(playlistId)) {
        return playlist;
      }

      const songIds = playlist.songIds || [];

      if (songIds.some(id => String(id) === String(song.id))) {
        return playlist;
      }

      return {
        ...playlist,
        songIds: [...songIds, String(song.id)]
      };
    })
  );

  setPickerSong(null);
  notify("Dodano utwór do playlisty!");
}
function startSidebarResize(e) {
  e.preventDefault();
  sidebarResizing.current = true;

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
}

useEffect(() => {
  function handleMouseMove(e) {
    if (!sidebarResizing.current) return;

    const newWidth = Math.max(
      200,
      Math.min(450, e.clientX)
    );

    setSidebarWidth(newWidth);
  }

  function handleMouseUp() {
    if (!sidebarResizing.current) return;

    sidebarResizing.current = false;

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };
}, []);

useEffect(() => {
  localStorage.setItem("muzeySidebarWidth", sidebarWidth);
}, [sidebarWidth]);
  function openView(next) { setView(next); setActivePlaylist(null); setSearch(""); }
  function renderSongCard(song) {
  return (
    <article
      className="song-card"
      key={song.id}
      onContextMenu={e => {
        e.preventDefault();

        setContext({
          song,
          x: Math.min(e.clientX, window.innerWidth - 235),
          y: Math.min(e.clientY, window.innerHeight - 180)
        });
      }}
    >
      <img
        className="cover"
        src={coverFor(song)}
        alt={`Okładka ${song.title}`}
        onError={e => {
          e.currentTarget.src = "/music.png";
        }}
      />

      <strong>{song.title}</strong>
      <span>{song.artist}</span>

      <button
        type="button"
        onClick={() => playSong(song)}
      >
        ▶ Odtwórz
      </button>
    </article>
  );
}
  function openSongMenu(e, song) {
  e.preventDefault();

  setContext({
    song,
    x: Math.max(8, Math.min(e.clientX, window.innerWidth - 225)),
    y: Math.max(8, Math.min(e.clientY, window.innerHeight - 190))
  });
}
  return <>
    <aside
  className="sidebar"
  style={{ width: sidebarWidth }}
>
  <div
    className="sidebar-resizer"
    onMouseDown={startSidebarResize}
    title="Przeciągnij, aby zmienić szerokość menu"
  />
      <h1 className="sidebar-logo"><img src="/music.png" alt="" className="sidebar-favicon"/> Muzey</h1>
      <nav>
  <button onClick={() => openView("home")}>
    ⌂ Strona główna
  </button>

  <button onClick={() => openView("library")}>
    ▤ Twoja biblioteka
  </button>

  <button onClick={() => openView("favorites")}>
    ♡ Ulubione
  </button>
</nav>
      <h3>Twoje playlisty</h3>
      
      <div id="customPlaylistList">
  {playlists.map(playlist => (
    <div className="sidebar-playlist-row" key={playlist.id}>

      <button
        className="sidebar-playlist"
        onClick={() => {
          setActivePlaylist(playlist);
          setView("playlist");
          setSearch("");
        }}
      >
        <span className="playlist-icon">♫</span>

        <span className="playlist-sidebar-name">
          {playlist.name}
        </span>

        <span className="playlist-song-count">
          {playlist.songIds?.length || 0}
        </span>
      </button>

      <div className="sidebar-playlist-actions">
        <button
          title="Odtwórz playlistę"
          onClick={() => startPlaylist(playlist)}
        >
          <Play size={18} fill="currentColor" />
        </button>

        <button
          title="Odtwórz losowo"
          onClick={() => startPlaylist(playlist, true)}
        >
          <Shuffle size={18} /> 
        </button>
      </div>

    </div>
  ))}
</div>
      <div className="create-playlist-inline">
  <button
    id="createPlaylistSidebar"
    onClick={() => setCreatePlaylistOpen(true)}
  >
    ＋ Utwórz playlistę
  </button>
</div>
      <div className="sidebar-bottom"><button className="sidebar-playlist" onClick={() => openView("all")}>♫ Wszystkie piosenki <span>{songs.length}</span></button></div>
    </aside>
    <main
  className="main-content"
  style={{ marginLeft: sidebarWidth }}
>
      <header><h2>{view==="home" ? "Odkryj swoją muzykę" : view==="favorites" ? "Ulubione" : view==="library" ? "Twoja biblioteka" : view==="playlist" ? activePlaylist?.name : "Wszystkie piosenki"}</h2><input id="search" type="search" placeholder="Szukaj utworu lub wykonawcy..." value={search} onChange={e=>setSearch(e.target.value)}/></header>
      {view === "home" && !search ? <div className="home-page">
        <section className="teleport-section">
  <div className="teleport-content">
    <span className="teleport-label">MUZEY DISCOVERY</span>

    <h2> Muzyczny Teleport</h2>

    <p>
      Odkryj na nowo piosenki, o których już zapomniałaś.
      Dokąd zabierze Cię muzyka?
    </p>

    <div className="teleport-buttons">
      <button
        className="teleport-main-button"
        onClick={() => musicTeleport()}
      >
         Teleportuj mnie!
      </button>

      <button
        className="teleport-secondary-button"
        onClick={() => musicTeleport(true)}
      >
        ♫ Nigdy niesłuchane
      </button>
    </div>
  </div>

  <div className="teleport-decoration">
    <span>♫</span>
  </div>
</section>
      <section className="home-section">
  <h3 className="home-section-title">
    Ostatnio słuchane playlisty
  </h3>

  <div className="recent-playlists-grid">
    {recentPlaylists
      .map(id =>
        playlists.find(
          p => String(p.id) === String(id)
        )
      )
      .filter(Boolean)
      .map(playlist => (
        <div
          className="recent-playlist-card"
          key={playlist.id}
          onClick={() => {
            setActivePlaylist(playlist);
            setView("playlist");
            setSearch("");
          }}
        >
          <div className="recent-playlist-cover">
            ♫
          </div>

          <div className="recent-playlist-info">
            <strong>{playlist.name}</strong>

            <span>
              {playlist.songIds?.length || 0} utworów
            </span>
          </div>

          <span className="recent-playlist-arrow">
            ❯
          </span>
        </div>
      ))}

    {recentPlaylists.length === 0 && (
      <p className="home-empty-message">
        Playlisty, z których odtworzysz muzykę,
        pojawią się tutaj.
      </p>
    )}
    
  </div>
  
</section>
{/* NOWOŚCI */}
<section className="home-section">
  <h3 className="home-section-title">
     Nowości
  </h3>

  <div className="home-section-content home-song-grid">
    {newestSongs.map(song => (
      <div
        className="home-song-card"
        key={song.id}
        onContextMenu={(e) => openSongMenu(e, song)}
      >
        <img
          className="home-song-cover"
          src={coverFor(song)}
          alt={song.title}
        />

        <div className="home-song-info">
          <strong>{song.title}</strong>
          <span>{song.artist}</span>
        </div>

        <button
          className="home-play-button"
          onClick={() => playSong(song)}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>
    ))}
  </div>
</section>
        <section className="home-section"><h3 className="home-section-title">Twoje ostatnie utwory</h3><div className="home-section-content home-song-grid">{recents.length ? recents.slice(0,4).map(id=>songs.find(s=>String(s.id)===id)).filter(Boolean).map(s=><div
  className="home-song-card"
  key={s.id}
  onContextMenu={(e) => openSongMenu(e, s)}
><img className="home-song-cover" src={coverFor(s)} alt=""/><div className="home-song-info"><strong>{s.title}</strong><span>{s.artist}</span></div><button className="home-play-button" onClick={()=>playSong(s)}>▶</button></div>) : <p className="home-empty-message">Odtwarzaj utwory, a pojawią się tutaj Twoje ostatnie piosenki.</p>}</div></section>
        <section className="home-section"><h3 className="home-section-title">Szybki wybór</h3><div className="home-section-content home-quick-grid">{songs.slice(0,6).map(s=><div
  className="home-song-card"
  key={s.id}
  onContextMenu={(e) => openSongMenu(e, s)}
><img className="home-song-cover" src={coverFor(s)} alt=""/><div className="home-song-info"><strong>{s.title}</strong><span>{s.artist}</span></div><button className="home-play-button" onClick={()=>playSong(s)}>▶</button></div>)}</div></section>
      </div> : (
  <>
    {view === "playlist" && activePlaylist && (
      <div className="playlist-play-actions">
        <button
          className="playlist-play-all"
          onClick={() => {
            const playlist = playlists.find(
              p => String(p.id) === String(activePlaylist.id)
            );

            if (playlist) startPlaylist(playlist);
          }}
        >
          <Play size={18} fill="currentColor" /> Odtwórz playlistę
        </button>

        <button
          className="playlist-play-shuffle"
          onClick={() => {
            const playlist = playlists.find(
              p => String(p.id) === String(activePlaylist.id)
            );

            if (playlist) startPlaylist(playlist, true);
          }}
        >
          <Shuffle size={18} /> Shuffle
        </button>
        <button
  className="playlist-delete-button"
  onClick={() => setDeletePlaylistOpen(true)}
>
  <span>🗑</span> Usuń playlistę
</button>
      </div>
      
    )}
      <div className="song-list">
  {filtered.map(song =>
    view === "playlist" ? (
      <div
        key={song.id}
        className="draggable-song"
        draggable
        onDragStart={e => {
          draggedSongId.current = song.id;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(song.id));
        }}
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          e.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={e => {
          e.currentTarget.classList.remove("drag-over");
        }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");

          reorderPlaylistSongs(song.id);
          draggedSongId.current = null;
        }}
        onDragEnd={e => {
          e.currentTarget.classList.remove("drag-over");
          draggedSongId.current = null;
        }}
      >
        <span className="drag-handle">⠿</span>
        {renderSongCard(song)}
      </div>
    ) : (
      renderSongCard(song)
    )
  )}

  {filtered.length === 0 && (
    <p className="home-empty-message">
      Brak utworów do wyświetlenia.
    </p>
  )}
</div>
</>
)}
    </main>
    <footer className="player">
      <div className="song-info"><strong>{current?.title || "Wybierz utwór"}</strong><span>{current?.artist || "Nie odtwarzasz muzyki"}</span></div>
      <div className="controls"><div className="buttons"><button aria-label="Poprzedni utwór" onClick={previousSong}>⏮</button>
      <button id="playButton"
  aria-label={playing ? "Pauza" : "Odtwórz"}
  onClick={() => {
    if (!current) return;

    if (audioSource === "mp3") {
      if (!audioRef.current) return;

      if (playing) {
      manuallyPausedRef.current = true;
      audioRef.current.pause();
} else {
  manuallyPausedRef.current = false;

  audioRef.current.play().catch(() => {
    notify("Nie udało się wznowić MP3.");
  });
}
    } else {
      if (!ytReady || !playerRef.current) return;

      if (playing) {
  manuallyPausedRef.current = true;

  clearTimeout(fallbackTimerRef.current);
  fallbackTimerRef.current = null;

  playerRef.current.pauseVideo();
  setPlaying(false);
} else {
  manuallyPausedRef.current = false;
  playerRef.current.playVideo();
}
    }
  }}
>
  {playing ? "⏸" : "▶"}
</button><button aria-label="Następny utwór" onClick={nextSong}>⏭</button></div>
      <div className="progress-row"><span>{timeText(elapsed)}</span><div className="wave-progress">
  <svg
  viewBox="0 0 1000 60"
  preserveAspectRatio="none"
  className={`wave-svg ${playing ? "wave-playing" : ""}`}
>
    <defs>
      <clipPath id="waveClip">
        <rect
          x="0"
          y="0"
          width={progress * 10}
          height="60"
        />
      </clipPath>
    </defs>

    {/* Cała sinusoida w tle */}
    <path
      d={Array.from({ length: 1001 }, (_, i) => {
        const y = 30 - 12 * Math.sin(i * 0.045);
        return `${i === 0 ? "M" : "L"}${i} ${y}`;
      }).join(" ")}
      className="wave-background"
    />

    {/* Odkrywana część sinusoidy */}
    <path
      d={Array.from({ length: 1001 }, (_, i) => {
        const y = 30 - 12 * Math.sin(i * 0.045);
        return `${i === 0 ? "M" : "L"}${i} ${y}`;
      }).join(" ")}
      className="wave-active"
      clipPath="url(#waveClip)"
    />
  </svg>

  <input
    type="range"
    min="0"
    max="100"
    step="0.1"
    value={progress}
    className="wave-input"
    aria-label="Przewiń utwór"
    onChange={(e) => {
      const p = Number(e.target.value);
      setProgress(p);

      if (duration) {
  if (audioSource === "mp3" && audioRef.current) {
    audioRef.current.currentTime = duration * p / 100;
  } else if (ytReady && playerRef.current) {
    playerRef.current.seekTo(duration * p / 100, true);
  }
}
    }}
  />
</div><span>{timeText(duration)}</span></div></div>
      <div className="volume"><button className="youtube-toggle" type="button" aria-label="Pokaż lub schowaj odtwarzacz YouTube" onClick={()=>setYoutubeOpen(v=>!v)}>{youtubeOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</button><label htmlFor="volume"><Volume2 size={20} /></label><input id="volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div>
    </footer>
    <div className={`youtube-drawer ${youtubeOpen?"":"collapsed"}`}><div className="youtube-player-container"><div id="youtubePlayer"></div></div></div>
    {context && <div className="context-menu active" style={{left:context.x,top:context.y}} onClick={e=>e.stopPropagation()}>
      <button onClick={()=>{playSong(context.song);setContext(null);}}>▶ Odtwórz utwór</button>
      <button onClick={()=>{toggleFavorite(context.song);setContext(null);}}>{favorites.includes(String(context.song.id))?"♥ Usuń z ulubionych":"♡ Dodaj do ulubionych"}</button>
      <button onClick={()=>{setPickerSong(context.song);setContext(null);}}>＋ Dodaj do playlisty</button>
      <button onClick={()=>{navigator.clipboard?.writeText(`${context.song.title} - ${context.song.artist}`);notify("Skopiowano nazwę utworu");setContext(null);}}>▣ Kopiuj nazwę utworu</button>
    </div>}
    {pickerSong && <div className="playlist-picker-overlay"><div className="playlist-picker"><h2>Wybierz playlistę</h2><p>Kliknij playlistę, do której chcesz dodać utwór.</p><div className="playlist-picker-list">{playlists.length ? playlists.map(p=><button key={p.id} onClick={()=>addToPlaylist(p.id,pickerSong)}>{p.name}</button>) : <p>Nie masz jeszcze playlist. Utwórz ją w panelu po lewej.</p>}</div><button className="playlist-picker-close" onClick={()=>setPickerSong(null)}>Anuluj</button></div></div>}
    {createPlaylistOpen && (
  <div
    className="playlist-picker-overlay"
    onClick={() => setCreatePlaylistOpen(false)}
  >
    <div
      className="playlist-picker"
      onClick={(e) => e.stopPropagation()}
    >
      <h2>♫ Nowa playlista</h2>

      <p>Podaj nazwę swojej nowej playlisty.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPlaylist();
        }}
      >
        <input
          className="playlist-name-input"
          type="text"
          placeholder="Nazwa playlisty..."
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          autoFocus
          maxLength={50}
        />

        <div className="playlist-create-buttons">
          <button
            type="button"
            className="playlist-picker-close"
            onClick={() => {
              setCreatePlaylistOpen(false);
              setPlaylistName("");
            }}
          >
            Anuluj
          </button>

          <button
            type="submit"
            className="playlist-create-confirm"
          >
            ＋ Utwórz
          </button>
        </div>
      </form>
    </div>
  </div>
)}
{/* OKIENKO POTWIERDZENIA USUNIĘCIA PLAYLISTY */}
{deletePlaylistOpen && activePlaylist && (
  <div
    className="muzey-modal-overlay"
    onClick={() => setDeletePlaylistOpen(false)}
  >
    <div
      className="muzey-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-playlist-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="muzey-delete-icon">🗑</div>

      <h2 id="delete-playlist-title">Usunąć playlistę?</h2>

      <p>
        Czy na pewno chcesz usunąć playlistę
        <strong> „{activePlaylist.name}”</strong>?
      </p>

      <span className="muzey-delete-warning">
        Tej operacji nie można cofnąć.
        Twoje piosenki pozostaną w bibliotece.
      </span>

      <div className="muzey-delete-actions">
        <button
          className="muzey-cancel-button"
          onClick={() => setDeletePlaylistOpen(false)}
        >
          Anuluj
        </button>

        <button
          className="muzey-confirm-delete"
          onClick={deletePlaylist}
        >
          Usuń playlistę
        </button>
      </div>
    </div>
  </div>
)}
    {toast && <div className="favorite-toast show"><span id="favoriteToastIcon">♥</span><span>{toast}</span></div>}
  </>;
}
createRoot(document.getElementById("root")).render(<App/>);
