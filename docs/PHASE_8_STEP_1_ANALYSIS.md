# 🚀 Phase 8: Step 1 - Video Player Migration (IN PROGRESS)

**Status**: 🔄 **Analyzing current implementation**

---

## 📊 Current Video Implementation Analysis

### **What We Have** (v1)

**Location**: `components/DirectStreamPageBase.tsx` lines 280-342, 552-667

**Current Setup**:
```tsx
// Native HTML5 video element
<video
  ref={videoRef}
  className="absolute inset-0 w-full h-full bg-black object-contain"
  controls
  playsInline
  data-testid="video-player"
/>

// HLS.js initialization (lines 280-342)
function initPlayer(url: string) {
  const video = videoRef.current;
  if (!video) return;
  
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    // ... error recovery, manifest parsing, etc.
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS (Safari)
    video.src = url;
    // ... event listeners
  }
}

// Fullscreen management (lines 346-371)
function toggleFullscreen() {
  const container = containerRef.current;
  if (!container) return;
  
  if (!isFullscreen) {
    container.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// Fullscreen detection
useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  // ...
}, []);
```

**State Management**:
- `status`: 'loading' | 'playing' | 'offline' | 'error'
- `isFullscreen`: boolean
- `videoRef`: ref to video element
- `containerRef`: ref to fullscreen container

**Features**:
- ✅ HLS.js integration with fallback to native
- ✅ Error recovery (network, media errors)
- ✅ Fullscreen support with keyboard shortcuts (F key)
- ✅ Native controls
- ✅ Auto-play on manifest loaded
- ✅ Status messages (offline, error, loading)

---

## 🎯 Migration Plan to v2

### **What We'll Use** (v2)

**Components**:
1. `VideoContainer` - Aspect ratio wrapper
2. `VideoPlayer` - HTML5 video with ref forwarding
3. `VideoControls` - Custom controls (play/pause, mute, volume, seek, fullscreen)
4. `useFullscreen` - Fullscreen hook

### **Migration Strategy**

#### **Phase 1A: Replace Video Element** ✅
Replace native `<video>` with v2 `VideoPlayer` component.

**Before**:
```tsx
<video
  ref={videoRef}
  className="absolute inset-0 w-full h-full bg-black object-contain"
  controls
  playsInline
  data-testid="video-player"
/>
```

**After**:
```tsx
<VideoContainer fullWidth aspectRatio="16:9" rounded={false}>
  <VideoPlayer
    ref={videoRef}
    src={bootstrap?.streamUrl || ''}
    autoPlay
    muted
    playsInline
    onPlay={() => setStatus('playing')}
    onPause={() => {}}
    onError={() => setStatus('error')}
    onLoadedMetadata={() => setStatus('playing')}
  />
</VideoContainer>
```

#### **Phase 1B: Replace Fullscreen Logic** ✅
Replace custom fullscreen with `useFullscreen` hook.

**Before**:
```tsx
const [isFullscreen, setIsFullscreen] = useState(false);

function toggleFullscreen() {
  const container = containerRef.current;
  if (!container) return;
  if (!isFullscreen) {
    container.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
}, []);
```

**After**:
```tsx
const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(containerRef.current);
```

#### **Phase 1C: Add Custom Controls** ✅
Add `VideoControls` below video player.

**New Addition**:
```tsx
<VideoControls
  isPlaying={status === 'playing'}
  isMuted={isMuted}
  volume={volume}
  currentTime={currentTime}
  duration={duration}
  onPlayPause={() => {
    if (videoRef.current) {
      if (status === 'playing') {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }}
  onMuteToggle={() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }}
  onVolumeChange={(newVolume) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  }}
  onSeek={(time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }}
  onFullscreenToggle={toggleFullscreen}
/>
```

#### **Phase 1D: Handle HLS Streams** ⚠️
**Challenge**: v2 `VideoPlayer` doesn't handle HLS.js directly.

**Options**:
1. **Keep HLS.js logic** - Initialize HLS.js separately, attach to VideoPlayer ref
2. **Use VideoPlayer src** - Let browser handle HLS natively (Safari only)
3. **Enhance VideoPlayer** - Add HLS.js support to v2 VideoPlayer

**Recommended**: **Option 1** - Keep HLS.js initialization logic, just update the ref usage.

---

## ✅ Implementation Checklist

### **Step 1A: Update Imports**
- [ ] Import `VideoContainer`, `VideoPlayer`, `VideoControls`
- [ ] Import `useFullscreen` hook
- [ ] Remove unused lucide icons if replaced

### **Step 1B: Update State**
- [ ] Add `isMuted`, `volume`, `currentTime`, `duration` state
- [ ] Keep `status` state for error/offline messages
- [ ] Remove redundant fullscreen state

### **Step 1C: Replace Fullscreen Logic**
- [ ] Replace custom fullscreen with `useFullscreen` hook
- [ ] Update keyboard shortcut to use `toggleFullscreen` from hook
- [ ] Update all `isFullscreen` references

### **Step 1D: Replace Video Element**
- [ ] Wrap in `VideoContainer`
- [ ] Replace `<video>` with `VideoPlayer`
- [ ] Add `VideoControls` component
- [ ] Update HLS.js initialization to use VideoPlayer ref

### **Step 1E: Test**
- [ ] Video plays correctly
- [ ] HLS streams load
- [ ] Controls work (play/pause, mute, volume, seek)
- [ ] Fullscreen works
- [ ] Error states display
- [ ] Keyboard shortcuts work

---

## 🚨 Challenges & Solutions

### **Challenge 1: HLS.js Integration**
**Problem**: v2 VideoPlayer doesn't include HLS.js logic.  
**Solution**: Keep `initPlayer` function, update to work with VideoPlayer ref.

### **Challenge 2: Status Messages**
**Problem**: Offline/error messages overlay on video.  
**Solution**: Keep existing overlay logic, just wrap video in VideoContainer.

### **Challenge 3: Fullscreen Container**
**Problem**: Fullscreen needs to encompass overlays (chat, scoreboard).  
**Solution**: Keep `containerRef` as fullscreen target, use `useFullscreen(containerRef.current)`.

### **Challenge 4: Native Controls**
**Problem**: Current has native controls, v2 uses custom.  
**Solution**: Disable native controls on VideoPlayer, add VideoControls.

---

## 📝 Next Steps

1. **Implement migration** (this step)
2. **Test thoroughly** (all pages, mobile, desktop)
3. **Fix any issues**
4. **Commit & move to Step 2** (Chat migration)

---

**Status**: Ready to implement! 🚀

