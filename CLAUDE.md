# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static HTML presentation for Datapace - a database performance optimization company pitch deck. The project is a single-page application that creates an interactive slideshow presentation with:

- 13 slides covering the full pitch deck (problem, solution, market, founder story, demo, etc.)
- Desktop presentation mode with keyboard navigation and scaling
- Mobile responsive design with vertical scrolling
- Table of contents navigation
- Embedded demo video

## Architecture

### Core Structure
- **index.html**: Main HTML file containing all slide content and structure
- **style.css**: Complete styling including desktop/mobile responsive design
- **script.js**: JavaScript for slide navigation, responsive behavior, and TOC functionality
- **assets/**: Image assets (logos, diagrams, founder photo)
- **test/**: Duplicate assets folder (appears to be for testing)

### Key Components

**Slide System**: 13 slides with different layouts and content types:
- Title slide with animated SVG backgrounds
- Content slides with various layouts (columns, grids, process flows)
- Demo slide with embedded iframe
- Thank you slide with social links

**Navigation**: 
- Desktop: Keyboard arrows, pagination buttons, TOC sidebar
- Mobile: Vertical scroll with TOC overlay

**Responsive Design**:
- Desktop (>1024px): Fixed slide dimensions (1280x720) with scaling
- Mobile (≤1024px): Stacked vertical layout with auto-sizing

## Development Commands

This is a static HTML project with no build system. To work with it:

### Running the Project
```bash
# Serve locally using Python
python -m http.server 8000
# OR using Node.js
npx serve .
# OR any static file server
```

### File Organization
- All source files are in the root directory
- Assets are organized in the `/assets` folder
- No compilation or build step required

## Common Development Tasks

### Adding/Modifying Slides
1. Edit slide content in `index.html` (search for `<div class="slide">`)
2. Update slide count in TOC navigation
3. Adjust `totalSlides` if adding/removing slides
4. Add corresponding styles in `style.css` if needed

### Styling Changes
- Main styles in `style.css` with CSS custom properties for theming
- Mobile-specific styles in `@media (max-width: 1024px)` section
- Slide-specific styles organized by slide number in comments

### Navigation Updates
- TOC links in `index.html` need `data-slide-index` attributes
- JavaScript handles both desktop and mobile navigation modes
- Keyboard navigation only active on desktop

## Key Technical Details

### Responsive Behavior
The application detects screen size and switches between:
- **Desktop Mode**: Fixed slide dimensions with transform scaling
- **Mobile Mode**: Vertical scroll layout with reset transforms

### Performance Considerations
- All slides loaded on initial page load
- SVG backgrounds used for scalable graphics
- Images should be optimized for web (current assets may need optimization)

### Browser Compatibility
- Uses modern CSS features (CSS Grid, Flexbox, CSS Custom Properties)
- JavaScript uses modern DOM APIs
- Targets modern browsers (ES6+)