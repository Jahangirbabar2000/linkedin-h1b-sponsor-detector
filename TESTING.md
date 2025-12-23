# Testing Guide

## Quick Test Steps

1. **Load the Extension**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this folder

2. **Test on LinkedIn**
   - Navigate to: https://www.linkedin.com/jobs/search/?currentJobId=4327737190&distance=25.0&geoId=103644278&keywords=Software%20Engineer&origin=JOBS_HOME_KEYWORD_HISTORY
   - Or any LinkedIn job posting page
   - The badge should appear automatically

3. **Check Console (Optional)**
   - Open Chrome DevTools (F12)
   - Check the Console tab for any warnings or errors
   - Look for messages starting with "H1B Sponsor Extension"

## Expected Behavior

- Badge appears near the job title
- Badge color indicates status:
  - Green = Sponsorship Available
  - Red = No Sponsorship  
  - Orange = Unclear
- Hovering over badge shows tooltip with details
- Badge updates when navigating to different job postings

## Troubleshooting

**Badge doesn't appear:**
- Check if you're on a LinkedIn job page (URL contains `/jobs/`)
- Check browser console for errors
- LinkedIn's UI may have changed - selectors might need updating

**Wrong analysis result:**
- The analysis is keyword-based - some nuanced language may not be caught
- Check the tooltip for which keywords were matched
- Consider the confidence level shown

**Icons missing:**
- Extension will work without icons, Chrome will show a default
- Add icon PNG files to `icons/` folder if desired

