# LinkedIn H1B Sponsor Detection Chrome Extension

A Chrome extension that automatically analyzes LinkedIn job postings to detect H1B visa sponsorship availability and displays a clear visual indicator directly on the job description page.

## 🚀 Features

- **Automatic Detection**: Analyzes job descriptions as you browse LinkedIn job postings
- **Smart Negative-Only Analysis**: Detects explicit "no sponsorship" statements (most jobs don't mention sponsorship, so absence of negative indicators = likely available)
- **Visual Badge Overlay**: Color-coded badge system:
  - 🟢 **Green**: Sponsorship Available (no negative indicators found)
  - 🔴 **Red**: No Sponsorship (explicit negative indicators detected)
- **Text Highlighting**: Automatically highlights sentences indicating no sponsorship with bright yellow background
- **Comprehensive Pattern Matching**: Detects ITAR requirements, citizenship requirements, and various "no sponsorship" phrasings


## Installation

### From Source

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the extension folder (`h1b-sponsor-plugin`)
6. The extension is now installed and active!

## Usage

1. Navigate to any LinkedIn job posting page
2. The extension will automatically:
   - Extract the job description
   - Analyze it for sponsorship indicators
   - Display a badge with the result
3. The badge appears near the job title with color-coded status
4. Hover over the badge to see details about the analysis

## Supported URL Patterns

The extension works on LinkedIn job pages with these URL patterns:
- `/jobs/search/?currentJobId=*` (search results with selected job)
- `/jobs/view/*` (direct job view page)
- `/jobs/collections/*` (job collections)

## How It Works

### Analysis Strategy

The extension uses a **negative-only detection approach**. Since most jobs don't explicitly state they offer sponsorship, we detect jobs that explicitly state they DON'T sponsor:

**Strong Negative Indicators** (No Sponsorship):
- "US citizens only", "U.S. citizenship required"
- "No sponsorship", "unable to sponsor", "cannot sponsor"
- "Must be authorized to work in the U.S." (without sponsorship mention)
- ITAR requirements (export control restrictions)
- "Green card holder" requirements

**Moderate Negative Indicators** (Likely No Sponsorship):
- "Authorized to work in the US" (when no sponsorship mentioned)
- "Legally authorized to work" requirements

### Result Logic

- **No negative indicators found** → ✅ "Yes - Sponsorship Available" (Green badge)
- **Negative indicators found** → ❌ "No - No Sponsorship" (Red badge)
- When "No Sponsorship" is detected, the relevant sentence is highlighted in yellow

## File Structure

```
h1b-sponsor-plugin/
├── manifest.json          # Extension configuration
├── content.js             # Main content script (page detection, description extraction)
├── analyzer.js            # Sponsorship detection logic (keyword patterns)
├── badge.js               # UI badge creation and management
├── highlighter.js         # Text highlighting for "no sponsorship" sentences
├── styles.css             # Badge and highlight styling
├── icons/                 # Extension icons (optional - add your own)
│   └── README.txt         # Instructions for adding icons
├── .gitignore            # Git ignore file
├── TESTING.md            # Testing guide
└── README.md             # This file
```

## Icons

You'll need to create three icon files for the extension:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

You can create simple icons or use any icon creation tool. The extension will work without icons, but Chrome will show a default placeholder.

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension format)
- **Content Scripts**: Run on LinkedIn job pages automatically
- **DOM Observers**: Uses MutationObserver to detect dynamic content loading
- **SPA Navigation**: Monitors `pushState` and `popstate` events for single-page app navigation

## Limitations

- Analysis is based on keyword matching - may not catch nuanced language
- LinkedIn's UI may change, requiring selector updates
- Some job descriptions may not be accessible due to page structure variations

## Future Enhancements

- AI-powered analysis using OpenAI/Claude API for more sophisticated detection
- Caching of analysis results
- Export/import of matched keywords
- Statistics tracking (how many jobs offer sponsorship)
- Support for other job sites (Indeed, Glassdoor, etc.)

## Privacy

This extension:
- Only runs on LinkedIn job pages
- Does not send any data to external servers
- All analysis happens locally in your browser
- Does not collect or store personal information

## Contributing

Feel free to submit issues or pull requests if you'd like to improve the extension!

## License

MIT License - feel free to use and modify as needed.

