# Brief V1: spectrum bands in InfoPanel.AudioMeter

Repo `E:\GitHub\MyRepos\InfoPanel.AudioMeter` (C#, net8.0-windows, an InfoPanel plugin). Context: the
dashboard visualiser (`E:\GitHub\MyRepos\InfoPanel.Dashboard\docs\redesign\visualizer\PLAN.md` §3.2)
needs real frequency bands. Today the plugin reads `IAudioMeterInformation` peak meters only
(`Services/CoreAudioService.cs`, raw COM in `Models/CoreAudioInterfaces.cs`). It has one container per
active render device plus `default-audio` (`Services/ContainerService.cs`), and updates every 50 ms
(`Models/AudioModels.cs`).

## Git
- Branch `feat/spectrum` from the current `1.2.0-dev`. The working tree already shows modified tracked
  files under `obj/`: never stage or commit anything under `obj/` or `bin/`, and stage source paths
  explicitly (`git add <paths>`).
- Conventional commit subjects (`feat:`, `fix:`, `docs:`, `chore:`), why in the body. No
  Co-Authored-By / Claude trailers, no "Generated with" footer, never override the author.
- Do not push.

## Build and verify
- `dotnet build InfoPanel.AudioMeter/InfoPanel.AudioMeter.csproj -c Release`. It references
  `E:\GitHub\PublicRepos\infopanel\InfoPanel.Plugins` (read-only, never modify that repo). Read the
  exit code directly, not through a pipe.
- Do not copy anything into InfoPanel's plugin folder and do not start or stop InfoPanel. Report the
  output folder.
- The repo has no test framework, so don't add one. Put the verification in `TestConsole`.

## What to build

### 1. Loopback capture (`Services/LoopbackCaptureService.cs` + COM interfaces)
- Per active render device, and for `default-audio` (the default render endpoint, eConsole, following
  default-device changes if cheap; else re-resolve when the capture fails):
  `IMMDevice.Activate(IAudioClient)` → `GetMixFormat` →
  `Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, 200 ms buffer, 0, mixFormat, null)` →
  `GetService(IAudioCaptureClient)` → `Start`.
- Add the COM interfaces you need (`IAudioClient`, `IAudioCaptureClient`, `WAVEFORMATEX`/`EXTENSIBLE`)
  beside the existing ones, in the same raw-COM style. No new NuGet dependency.
- One background thread polls all capture clients every ~10 ms (`GetNextPacketSize` / `GetBuffer` /
  `ReleaseBuffer`). Handle `AUDCLNT_BUFFERFLAGS_SILENT`, 32-bit float and 16/24-bit PCM, and any channel
  count (mix to mono).
- Loopback delivers no packets while nothing plays: after 150 ms without data, a device's spectrum
  decays to zeros.
- A device that fails (unplugged, exclusive mode) is logged once and retried every 5 s. It must never
  throw into `Update()`.
- Dispose cleanly in `Close()`: stop the clients, end the thread, release the COM objects.

### 2. Spectrum (`Services/SpectrumAnalyzer.cs`, pure and allocation-free per frame)
- Ring buffer of mono samples. Every hop of 1024 samples, run a 2048-point FFT with a Hann window
  (a small iterative radix-2 FFT, precomputed twiddles and window).
- Magnitude normalised so a full-scale sine reads 0 dBFS. Convert to dB.
- Bands: N log-spaced bands from `SpectrumMinHz` to `SpectrumMaxHz` (defaults 30 and 16000, N = 32).
  A band's value is the max bin magnitude in its range. A band narrower than one bin takes the nearest
  bin. Use the device's actual sample rate.
- Map dB to 0..100: `clamp((db - floor) / -floor, 0, 1) * 100` with `SpectrumFloorDb` (default -80).
- Light per-band smoothing in the plugin: attack instant, release 0.6 per hop. The dashboard does its
  own easing, so keep this mild.

### 3. Entry (`ContainerService` / `AudioLevelMeter.Update`)
- **Contract, do not change:** a new `PluginText` per container, id `spectrum`, name `Spectrum`. Its
  value is the band values as comma-separated integers 0..100, lowest band first, no spaces, e.g.
  `"0,12,40,…"`, exactly N values. It is all zeros when silent and an empty string when the spectrum is
  disabled or the device failed. The dashboard reads it as
  `plugins.audio-level-meter.<container>.spectrum`.
- `Update()` (every 50 ms) copies the latest bands under a lock or by an atomic swap. No FFT on the
  update thread.
- Every existing entry, id, name, unit and behaviour is unchanged.

### 4. Config (`ConfigurationService`, the existing ini)
- A `[Spectrum]` section: `Enabled=true`, `Bands=32` (clamp 8..64), `MinHz=30`, `MaxHz=16000`,
  `FloorDb=-80`. Missing keys take the defaults; write them out when the ini is first created, as the
  existing settings do.

### 5. Version and docs
- Version 1.3.0 in the csproj and `PluginInfo.ini` if it holds a version.
- CHANGELOG entry (follow its existing format). README: the `spectrum` entry and the `[Spectrum]` keys.

### 6. Verification (in `TestConsole`, report the real output)
- **Self-test, no audio device needed:** feed `SpectrumAnalyzer` synthetic sines at 48 kHz (100 Hz,
  1 kHz, 5 kHz, full scale and -20 dBFS). Print the band index with the max value and the expected
  band for that frequency. They must match, and -20 dBFS must read about 20 dB lower. Silence must give
  all zeros. Exit non-zero on a mismatch.
- **Live:** run the loopback on the default device for ~5 s while a 1 kHz tone plays through the
  default output. Generate a WAV in a temp file and play it with `System.Media.SoundPlayer`, or in
  PowerShell. Print the spectrum string a few times, with the peak band.
- `dotnet build` (Release) exit 0, and the TestConsole self-test exit 0.

Report in ≤12 lines: commits, the build output folder, the self-test output (the peak band per tone),
the live result, and anything not done.
