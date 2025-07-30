document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables for Presentation State ---
    const slides = Array.from(document.querySelectorAll('.slide'));
    const tocToggle = document.getElementById('toc-toggle');
    const tocContainer = document.getElementById('toc');
    const pageCounter = document.getElementById('page-counter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pagination = document.querySelector('.pagination');
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    let touchStartY = 0;
    let touchEndY = 0;
    let isScrolling = false;

    // --- Core Function to Show a Specific Slide ---
    window.showSlide = function(slideIndex) {
        if (slideIndex < 0 || slideIndex >= totalSlides) return;
        
        currentSlide = slideIndex;

        // On mobile, scroll to the slide with improved behavior
        if (window.innerWidth <= 768) {
            const targetSlide = slides[currentSlide];
            if (targetSlide) {
                // Use a small timeout to ensure the TOC is closed before scrolling
                setTimeout(() => {
                    const rect = targetSlide.getBoundingClientRect();
                    const scrollTop = window.pageYOffset + rect.top - 20; // 20px offset from top
                    window.scrollTo({ 
                        top: scrollTop, 
                        behavior: 'smooth' 
                    });
                }, 50);
            }
        } else { // On desktop, transition between slides
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === currentSlide);
                // Reset scroll position of the new slide
                if (index === currentSlide) {
                    const slideContainer = slide.querySelector('.slide-container');
                    if (slideContainer) slideContainer.scrollTop = 0;
                }
            });
        }
        updatePagination();
    };

    function updatePagination() {
        if (pageCounter) {
            pageCounter.textContent = `${currentSlide + 1} / ${totalSlides}`;
        }
        if (prevBtn && nextBtn) {
             prevBtn.disabled = currentSlide === 0;
             nextBtn.disabled = currentSlide === totalSlides - 1;
             prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';
             nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';
        }
    }

    // --- Table of Contents Logic ---
    tocToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.toggle('toc-open');
    });

    // Close TOC when clicking outside
    document.addEventListener('click', (e) => {
        if (document.body.classList.contains('toc-open') && 
            !tocContainer.contains(e.target) && 
            !tocToggle.contains(e.target)) {
            document.body.classList.remove('toc-open');
        }
    });

    tocContainer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const slideIndex = parseInt(link.getAttribute('data-slide-index'), 10);
            document.body.classList.remove('toc-open');
            showSlide(slideIndex);
        });
    });

    // --- STARTFIX: Refactored desktop/mobile handling ---
    
    // Function to handle desktop-specific slide scaling
    function scalePresentation() {
        const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
        slides.forEach(slide => {
            const container = slide.querySelector('.slide-container');
            if(container) container.style.transform = `scale(${scale})`;
        });
    }

    // Function to handle keyboard navigation
    function handleKeyDown(e) {
        if (document.body.classList.contains('toc-open')) return; // Don't navigate when TOC is open
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            showSlide(currentSlide + 1);
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            showSlide(currentSlide - 1);
        }
    }

    // --- Touch and Swipe Handling for Mobile ---
    function handleTouchStart(e) {
        if (window.innerWidth > 768) return;
        touchStartY = e.touches[0].clientY;
        isScrolling = false;
    }

    function handleTouchMove(e) {
        if (window.innerWidth > 768 || isScrolling) return;
        
        const touchMoveY = e.touches[0].clientY;
        const deltaY = Math.abs(touchMoveY - touchStartY);
        
        // If user is scrolling vertically, don't interfere
        if (deltaY > 10) {
            isScrolling = true;
        }
    }

    function handleTouchEnd(e) {
        if (window.innerWidth > 768 || isScrolling) return;
        
        touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchStartY - touchEndY;
        const minSwipeDistance = 50;
        
        if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                // Swiped up - go to next slide
                showSlide(currentSlide + 1);
            } else {
                // Swiped down - go to previous slide
                showSlide(currentSlide - 1);
            }
        }
    }

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // This function checks the screen size and applies/removes desktop-only features
    function handleScreenMode() {
        if (window.innerWidth > 768) {
            // --- DESKTOP MODE ---
            // Ensure pagination is visible
            if (pagination) pagination.style.display = 'flex';
            
            // Add desktop event listeners if they aren't already there
            window.addEventListener('resize', scalePresentation);
            document.addEventListener('keydown', handleKeyDown);

            // Add button listeners
            if (prevBtn) prevBtn.onclick = () => showSlide(currentSlide - 1);
            if (nextBtn) nextBtn.onclick = () => showSlide(currentSlide + 1);
            
            // Initial setup call
            scalePresentation();
            showSlide(currentSlide); // Re-run to ensure correct active state
        } else {
            // --- MOBILE MODE ---
            // Ensure pagination is hidden
            if (pagination) pagination.style.display = 'none';

            // Remove desktop event listeners to prevent conflicts
            window.removeEventListener('resize', scalePresentation);
            document.removeEventListener('keydown', handleKeyDown);

            // Nullify button clicks
            if (prevBtn) prevBtn.onclick = null;
            if (nextBtn) nextBtn.onclick = null;
            
            // Reset any scaling transforms from desktop mode
            slides.forEach(slide => {
                const container = slide.querySelector('.slide-container');
                if (container) container.style.transform = '';
            });
            
            // Enable smooth scrolling for mobile
            document.documentElement.style.scrollBehavior = 'smooth';
        }
        updatePagination();
    }
    
    // Listen for resize events to switch between modes
    window.addEventListener('resize', handleScreenMode);

    // --- Scroll-based slide tracking for mobile ---
    let scrollTimeout;
    function handleScroll() {
        if (window.innerWidth > 768) return;
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Find which slide is most visible
            let mostVisibleSlide = 0;
            let maxVisibility = 0;
            
            slides.forEach((slide, index) => {
                const rect = slide.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                // Calculate how much of the slide is visible
                const visibleTop = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
                const slideHeight = rect.height;
                const visibility = visibleTop / Math.min(slideHeight, viewportHeight);
                
                if (visibility > maxVisibility) {
                    maxVisibility = visibility;
                    mostVisibleSlide = index;
                }
            });
            
            if (mostVisibleSlide !== currentSlide) {
                currentSlide = mostVisibleSlide;
                updatePagination();
            }
        }, 100);
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // --- Performance optimizations ---
    // Lazy load iframe content
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const iframe = entry.target.querySelector('iframe');
                if (iframe && !iframe.src) {
                    iframe.src = iframe.dataset.src;
                }
            }
        });
    });
    
    slides.forEach(slide => {
        observer.observe(slide);
    });

    // Initial check on page load
    handleScreenMode();
});