# Resources

Place your application icons and binaries here:

## Required Icons
- `icon.ico` - Windows icon (256x256)
- `icon.icns` - macOS icon
- `icon.png` - Linux icon (512x512)

## Bundled Binaries (optional)
If you want to bundle yt-dlp with the application:

```
resources/
  bin/
    win/
      yt-dlp.exe
    mac/
      yt-dlp
    linux/
      yt-dlp
```

Otherwise, users need to install yt-dlp manually and configure its path in Settings.

## Installing yt-dlp
- Windows: `winget install yt-dlp` or download from https://github.com/yt-dlp/yt-dlp/releases
- macOS: `brew install yt-dlp`
- Linux: `pip install yt-dlp` or `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`

## Installing ffmpeg
- Windows: `winget install ffmpeg` or download from https://ffmpeg.org/download.html
- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`
