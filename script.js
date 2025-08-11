document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication System ---
    const authContainer = document.getElementById('auth-container');
    const presentationContainer = document.getElementById('presentation-container');
    const loginForm = document.getElementById('login-form');
    const ndaForm = document.getElementById('nda-form');
    const authFormEl = document.getElementById('auth-form');
    const ndaSignForm = document.getElementById('nda-sign-form');
    const backToAuthBtn = document.getElementById('back-to-auth');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const linkedinAuthBtn = document.getElementById('linkedin-auth-btn');

    // Access codes (in a real application, this would be handled server-side)
    const validAccessCodes = ['DATAPACE2024', 'INVESTOR001', 'DEMO123'];

    // Check if user is already authenticated
    async function checkAuthentication() {
        const authData = localStorage.getItem('datapace_auth');
        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                if (parsed.authenticated && parsed.ndaSigned && parsed.sessionToken) {
                    // Validate session with database
                    const sessionResult = await SupabaseDB.validateSession(parsed.sessionToken);
                    
                    if (sessionResult.success) {
                        showPresentation(parsed);
                        return true;
                    } else {
                        // Session expired or invalid
                        localStorage.removeItem('datapace_auth');
                        console.log('Session validation failed:', sessionResult.error);
                    }
                }
            } catch (e) {
                localStorage.removeItem('datapace_auth');
                console.error('Error checking authentication:', e);
            }
        }
        return false;
    }

    // Show presentation after successful authentication
    function showPresentation(userData) {
        authContainer.style.display = 'none';
        presentationContainer.style.display = 'block';
        userInfo.textContent = `${userData.fullName} (${userData.company})`;
        // Restore hidden overflow for presentation mode
        document.body.style.overflow = 'hidden';
        initializePresentation();
    }

    // Handle LinkedIn OAuth authentication
    linkedinAuthBtn.addEventListener('click', async () => {
        const originalText = linkedinAuthBtn.textContent;
        linkedinAuthBtn.textContent = 'Connecting to LinkedIn...';
        linkedinAuthBtn.disabled = true;

        try {
            // Initiate LinkedIn OAuth (simplified for demo - in production use proper OAuth flow)
            const linkedinProfile = await new Promise((resolve, reject) => {
                // For demo purposes, we'll simulate LinkedIn data
                // In real implementation, use proper LinkedIn OAuth flow
                const mockLinkedInData = {
                    id: 'demo-linkedin-id',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@company.com',
                    company: 'Demo Company Inc.',
                    profilePicture: null
                };
                
                // Simulate OAuth popup experience
                setTimeout(() => {
                    resolve(mockLinkedInData);
                }, 1500);
            });

            // Auto-populate form with LinkedIn data
            document.getElementById('email').value = linkedinProfile.email;
            document.getElementById('company').value = linkedinProfile.company;
            
            // Store LinkedIn data for NDA pre-population
            sessionStorage.setItem('linkedin_profile', JSON.stringify({
                ...linkedinProfile,
                fullName: `${linkedinProfile.firstName} ${linkedinProfile.lastName}`,
                linkedinAuth: true
            }));

            // Show success message and focus on access code
            alert(`Welcome ${linkedinProfile.firstName}! Please enter your access code to continue.`);
            document.getElementById('access-code').focus();

        } catch (error) {
            console.error('LinkedIn auth error:', error);
            alert('LinkedIn authentication failed. Please try manual entry or try again.');
        } finally {
            linkedinAuthBtn.textContent = originalText;
            linkedinAuthBtn.disabled = false;
        }
    });

    // Handle authentication form submission
    authFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const company = document.getElementById('company').value;
        const accessCode = document.getElementById('access-code').value;

        if (!email || !company || !accessCode) {
            alert('Please fill in all fields');
            return;
        }

        if (!validAccessCodes.includes(accessCode)) {
            alert('Invalid access code. Please contact Datapace for access.');
            return;
        }

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Authenticating...';
        submitBtn.disabled = true;

        try {
            // Get user IP address
            const ipAddress = await SupabaseDB.getUserIP();

            // Create auth session in database
            const authResult = await SupabaseDB.createAuthSession({
                email,
                company,
                accessCode,
                ipAddress,
                userAgent: navigator.userAgent
            });

            if (!authResult.success) {
                throw new Error(authResult.error);
            }

            // Get LinkedIn profile data if available
            const linkedinProfile = sessionStorage.getItem('linkedin_profile');
            let profileData = {};
            if (linkedinProfile) {
                profileData = JSON.parse(linkedinProfile);
            }

            // Store temporary auth data for NDA process
            const tempAuthData = {
                sessionId: authResult.data.id,
                sessionToken: authResult.data.session_token,
                email,
                company,
                authenticated: true,
                timestamp: new Date().getTime(),
                ...profileData
            };
            
            sessionStorage.setItem('temp_auth', JSON.stringify(tempAuthData));
            
            // Pre-populate NDA form if LinkedIn data is available
            if (profileData.linkedinAuth && profileData.fullName) {
                document.getElementById('full-name').value = profileData.fullName;
            }
            
            // Show NDA form
            loginForm.style.display = 'none';
            ndaForm.style.display = 'block';

        } catch (error) {
            console.error('Authentication error:', error);
            alert('Authentication failed: ' + error.message);
        } finally {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Handle NDA form submission
    ndaSignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('full-name').value;
        const signature = document.getElementById('signature').value;
        const ndaAgreed = document.getElementById('nda-agree').checked;

        if (!fullName || !signature || !ndaAgreed) {
            alert('Please complete all fields and agree to the NDA terms');
            return;
        }

        if (signature.toLowerCase() !== fullName.toLowerCase()) {
            alert('Digital signature must match your full legal name');
            return;
        }

        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing NDA...';
        submitBtn.disabled = true;

        try {
            // Get temp auth data
            const tempAuthData = JSON.parse(sessionStorage.getItem('temp_auth'));
            
            if (!tempAuthData || !tempAuthData.sessionId) {
                throw new Error('Session data not found. Please try logging in again.');
            }

            // Store NDA signature in database
            const ndaResult = await SupabaseDB.createNDASignature({
                sessionId: tempAuthData.sessionId,
                fullName,
                signature
            });

            if (!ndaResult.success) {
                throw new Error(ndaResult.error);
            }

            // Complete authentication data
            const finalAuthData = {
                sessionId: tempAuthData.sessionId,
                sessionToken: tempAuthData.sessionToken,
                email: tempAuthData.email,
                company: tempAuthData.company,
                fullName,
                signature,
                authenticated: true,
                ndaSigned: true,
                ndaSignedAt: new Date().toISOString(),
                timestamp: tempAuthData.timestamp
            };

            // Store in localStorage for session persistence
            localStorage.setItem('datapace_auth', JSON.stringify(finalAuthData));
            sessionStorage.removeItem('temp_auth');
            
            console.log('Access granted and stored in database:', {
                timestamp: new Date().toISOString(),
                email: finalAuthData.email,
                company: finalAuthData.company,
                fullName: finalAuthData.fullName,
                sessionId: finalAuthData.sessionId
            });

            showPresentation(finalAuthData);

        } catch (error) {
            console.error('NDA signing error:', error);
            alert('NDA signing failed: ' + error.message);
        } finally {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Back to login button
    backToAuthBtn.addEventListener('click', () => {
        ndaForm.style.display = 'none';
        loginForm.style.display = 'block';
        sessionStorage.removeItem('temp_auth');
        sessionStorage.removeItem('linkedin_profile');
        // Clear form fields
        document.getElementById('full-name').value = '';
        document.getElementById('signature').value = '';
        document.getElementById('nda-agree').checked = false;
    });

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout? You will need to re-authenticate to access the presentation.')) {
            localStorage.removeItem('datapace_auth');
            sessionStorage.removeItem('temp_auth');
            presentationContainer.style.display = 'none';
            authContainer.style.display = 'flex';
            loginForm.style.display = 'block';
            ndaForm.style.display = 'none';
            
            // Allow scrolling for auth forms on mobile
            document.body.style.overflow = 'auto';
            
            // Reset forms
            authFormEl.reset();
            ndaSignForm.reset();
        }
    });

    // Initialize authentication check
    async function initializeAuth() {
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
            authContainer.style.display = 'flex';
            presentationContainer.style.display = 'none';
            // Allow body scrolling for auth forms on mobile
            document.body.style.overflow = 'auto';
        }
    }
    
    // Start authentication check
    initializeAuth();

    // Presentation initialization function
    function initializePresentation() {
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

    // Pricing toggle functionality
    const pricingToggle = document.getElementById('pricing-toggle');
    if (pricingToggle) {
        function togglePricing(showAnnual) {
            const monthlyPrices = document.querySelectorAll('.monthly-price');
            const annualPrices = document.querySelectorAll('.annual-price');
            
            console.log('Toggle pricing called:', showAnnual, 'Monthly elements:', monthlyPrices.length, 'Annual elements:', annualPrices.length);
            
            if (showAnnual) {
                // Show annual pricing
                monthlyPrices.forEach(price => price.style.display = 'none');
                annualPrices.forEach(price => price.style.display = 'inline');
            } else {
                // Show monthly pricing
                monthlyPrices.forEach(price => price.style.display = 'inline');
                annualPrices.forEach(price => price.style.display = 'none');
            }
        }
        
        // Simple event listener for toggle change
        pricingToggle.addEventListener('change', function(e) {
            console.log('Toggle changed:', this.checked);
            togglePricing(this.checked);
        });
        
        // Also handle clicks on the entire toggle switch label
        const toggleSwitchLabel = pricingToggle.parentElement;
        if (toggleSwitchLabel) {
            toggleSwitchLabel.addEventListener('click', function(e) {
                // Let the default behavior handle the input change
                console.log('Toggle switch clicked');
            });
        }
        
        // Initialize with monthly pricing visible
        togglePricing(false);
    }

        // Initial check on page load
        handleScreenMode();
    }
});