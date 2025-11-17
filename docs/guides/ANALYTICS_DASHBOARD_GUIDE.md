# Analytics Dashboard - User Guide

**Version:** 1.0.0  
**Sprint:** 36  
**Last Updated:** 2025-11-17

---

## 📊 Overview

The Analytics Dashboard provides comprehensive insights into your music generation activity, AI usage, and track performance. Access real-time metrics, interactive charts, and detailed statistics to optimize your creative workflow.

---

## 🚀 Quick Start

### Accessing Analytics

1. **Navigate:** `/workspace/analytics`
2. **Or:** Click "Analytics" in the workspace sidebar
3. **Select:** Time range (7 days, 30 days, or 90 days)
4. **Explore:** Switch between tabs for different views

---

## 📈 Key Metrics

### 1. Total Generations
**Description:** Total number of music generation attempts  
**Includes:** All statuses (pending, processing, completed, failed)  
**Trend:** Shows percentage change vs previous period

**What it means:**
- High count = Active user
- Increasing trend = Growing usage
- Stable count = Consistent workflow

### 2. Completed Tracks
**Description:** Successfully generated music tracks  
**Formula:** `tracks where status = 'completed'`  
**Trend:** Shows growth rate

**What it means:**
- Success indicator
- Quality of inputs
- System reliability

### 3. AI Usage Today
**Description:** Number of AI field improvements used today  
**Limit:** 10 for free, 100 for pro  
**Resets:** Daily at 00:00 UTC

**What it means:**
- How much AI assistance you've used
- Remaining quota for the day
- Value of subscription tier

### 4. Average Generation Time
**Description:** Mean time to complete a track  
**Unit:** Seconds  
**Trend:** Lower is better

**What it means:**
- System performance
- Queue wait time
- Provider efficiency (Suno vs Mureka)

### 5. Success Rate
**Description:** Percentage of completed tracks  
**Formula:** `(completed / total) * 100`  
**Range:** 0-100%

**What it means:**
- Quality of prompts
- System reliability
- User skill level

### 6. AI Total Usage
**Description:** All-time AI field improvements  
**Cumulative:** Never resets  
**Trend:** Shows growth rate

**What it means:**
- Total AI value received
- Power user indicator
- ROI of subscription

---

## 📊 Charts & Visualizations

### Generation Trends (Line Chart)

**What it shows:**
- **Completed** (Blue line) - Successful generations
- **Failed** (Red line) - Failed attempts
- **Total** (Gray dashed) - All attempts

**How to read:**
- **Peaks** - High activity days
- **Valleys** - Low activity days
- **Gaps between completed and total** - Failure rate

**Use cases:**
- Identify best times to generate
- Spot patterns in failures
- Track productivity over time

### AI Usage Analytics (Bar Chart)

**What it shows:**
- **Improve** (Blue bars) - Enhance existing text
- **Generate** (Purple bars) - Create new content
- **Rewrite** (Orange bars) - Recreate in new style

**How to read:**
- **Tallest bars** - Most used action
- **Missing bars** - Days with no AI usage
- **Stacked view** - Total AI activity

**Use cases:**
- Understand AI usage patterns
- Optimize subscription tier
- Learn which actions are most valuable

### Activity Heatmap

**Status:** 🚧 Coming soon  
**Planned features:**
- Hour-by-hour activity
- Day-of-week patterns
- Productivity insights

### Top Tracks Table

**What it shows:**
- **#** - Rank by play count
- **Track** - Title and cover art
- **Plays** - Number of times played
- **Likes** - Heart count
- **Created** - Generation date

**How to use:**
- **Click track** - Open track details
- **Sort** - Click column headers
- **Analyze** - Find what works

---

## ⏱️ Time Ranges

### 7 Days
**Best for:**
- Recent performance
- Weekly patterns
- Short-term trends

**Limitations:**
- Small sample size
- May miss patterns

### 30 Days (Default)
**Best for:**
- Monthly overview
- Balanced view
- Most use cases

**Limitations:**
- Moderate detail level

### 90 Days
**Best for:**
- Long-term trends
- Seasonal patterns
- Big picture view

**Limitations:**
- May hide short-term changes
- Slower data loading

---

## 💡 Tips & Best Practices

### Maximizing Insights

1. **Check daily** - Monitor AI usage to avoid hitting limits
2. **Compare periods** - Use time ranges to spot trends
3. **Track success rate** - Optimize prompts to improve
4. **Analyze top tracks** - Learn what resonates

### Improving Metrics

**To increase success rate:**
- Use clearer prompts
- Add more context (genre, mood)
- Reference successful tracks
- Experiment with different providers

**To reduce generation time:**
- Generate during off-peak hours
- Use simpler prompts
- Avoid custom mode if not needed
- Consider Mureka for faster results

**To optimize AI usage:**
- Use "Improve" for minor tweaks
- Use "Generate" for fresh ideas
- Use "Rewrite" for style changes
- Save improved versions as templates

---

## 🐛 Troubleshooting

### "No data available"

**Causes:**
- No tracks in selected time range
- Not authenticated
- Database connection issue

**Solutions:**
1. Change time range to "90 Days"
2. Generate some tracks first
3. Refresh the page
4. Check browser console for errors

### "Charts not loading"

**Causes:**
- Slow network connection
- Too much data
- Browser compatibility

**Solutions:**
1. Wait for loading skeleton to finish
2. Try shorter time range (7 days)
3. Update browser to latest version
4. Disable browser extensions

### "Metrics seem wrong"

**Causes:**
- Cache not updated
- Query filters applied
- Time zone differences

**Solutions:**
1. Hard refresh (Ctrl+Shift+R)
2. Check URL parameters
3. Compare with actual track count in library
4. Contact support if persists

---

## 📱 Mobile Experience

### Optimizations

- ✅ Responsive charts
- ✅ Touch-friendly metrics
- ✅ Scrollable tables
- ✅ Collapsed navigation

### Limitations

- Charts may be smaller
- Tables require horizontal scroll
- Some hover effects disabled

---

## 🔒 Privacy & Data

### What We Track

- Track generation events
- AI usage counts
- Play/like/download counts
- Timestamps and dates

### What We Don't Track

- Lyrics content
- Audio file contents
- Personal information beyond user ID
- Third-party identifiers

### Data Retention

- Analytics data: Indefinite
- Aggregated metrics: 90 days
- Detailed events: 30 days

---

## 📚 Related Guides

- [AI Field Improvement Guide](./AI_FIELD_IMPROVEMENT_GUIDE.md)
- [Subscription System Guide](./SUBSCRIPTION_SYSTEM_GUIDE.md)
- [Music Generation Guide](./MUSIC_GENERATION_GUIDE.md)

---

## 🆘 Support

### Getting Help

1. **Check this guide** - Most answers here
2. **Browse FAQs** - Common questions
3. **Contact support** - For technical issues
4. **Join community** - Share insights

### Feedback

We'd love to hear your thoughts:
- Feature requests
- UI/UX improvements
- Bug reports
- Success stories

---

**Guide Version:** 1.0.0  
**Last Updated:** 2025-11-17  
**Author:** Albert3 Muse Synth Studio Team
