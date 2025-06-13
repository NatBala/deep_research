/**
 * Deep Insights Assistant - Frontend JavaScript
 * Handles WebSocket connections, UI updates, and user interactions
 */

class InsightsApp {
    constructor() {
        console.log('InsightsApp constructor called');
        this.ws = null;
        this.sessionId = this.generateSessionId();
        this.isResearching = false;
        this.currentTopic = '';
        this.finalReport = '';
        
        // Edit mode state
        this.isEditMode = false;
        this.originalReport = '';
        this.hasUnsavedChanges = false;
        
        // Section regeneration state
        this.isSectionMode = false;
        this.selectedSection = null;
        this.sectionContent = '';
        this.regeneratingSection = null;
        
        // Finalizing mode flag
        this.isFinalizingMode = false;
        
        console.log('About to call init()');
        this.init();
        console.log('InsightsApp fully initialized');
    }
    
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    init() {
        this.setupEventListeners();
        this.setupWebSocket();
    }
    
    setupEventListeners() {
        // Start research button
        const startBtn = document.getElementById('start-research-btn');
        const topicInput = document.getElementById('topic-input');
        
        startBtn.addEventListener('click', () => this.startResearch());
        
        // Enter key in textarea
        topicInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.startResearch();
            }
        });
        
        // Topic chips
        document.querySelectorAll('.topic-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const topic = e.target.getAttribute('data-topic');
                topicInput.value = topic;
                this.startResearch();
            });
        });
        
        // Action buttons
        document.getElementById('copy-report-btn').addEventListener('click', () => this.copyReport());
        document.getElementById('download-report-btn').addEventListener('click', () => this.downloadReport());
        document.getElementById('new-research-btn').addEventListener('click', () => this.resetApp());
        document.getElementById('retry-btn').addEventListener('click', () => this.retryResearch());
        
        // Toggle raw markdown
        document.getElementById('toggle-raw-btn').addEventListener('click', () => this.toggleRawMarkdown());
        
        // Edit mode functionality
        document.getElementById('edit-mode-btn').addEventListener('click', () => this.toggleEditMode());
        document.getElementById('save-edits-btn').addEventListener('click', () => this.saveEdits());
        document.getElementById('cancel-edits-btn').addEventListener('click', () => this.cancelEdits());
        document.getElementById('reset-report-btn').addEventListener('click', () => this.resetReport());
        
        // Section regeneration functionality will be set up after report generation
        // this.setupSectionEventListeners(); // Moved to showResults
    }
    
    setupSectionEventListeners() {
        console.log('setupSectionEventListeners called');
        // Set up section regeneration event listeners with error checking
        const sectionRegenBtn = document.getElementById('section-regen-btn');
        console.log('section-regen-btn found:', !!sectionRegenBtn);
        if (sectionRegenBtn) {
            console.log('Adding click listener to section-regen-btn');
            sectionRegenBtn.addEventListener('click', () => {
                console.log('Section regen button clicked via event listener');
                this.toggleSectionMode();
            });
        } else {
            console.log('section-regen-btn not found (this is normal during initial setup)');
        }
        
        const exitSectionBtn = document.getElementById('exit-section-mode-btn');
        if (exitSectionBtn) {
            exitSectionBtn.addEventListener('click', () => this.exitSectionMode());
        }
        
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeFeedbackModal());
        }
        
        const cancelFeedbackBtn = document.getElementById('cancel-feedback-btn');
        if (cancelFeedbackBtn) {
            cancelFeedbackBtn.addEventListener('click', () => this.closeFeedbackModal());
        }
        
        const regenerateSectionBtn = document.getElementById('regenerate-section-btn');
        if (regenerateSectionBtn) {
            regenerateSectionBtn.addEventListener('click', () => this.regenerateSection());
        }
        
        // Feedback chips
        document.querySelectorAll('.feedback-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const feedback = e.target.getAttribute('data-feedback');
                const feedbackInput = document.getElementById('section-feedback');
                if (feedbackInput) {
                    feedbackInput.value = feedback;
                }
            });
        });
        
        // Modal overlay click to close
        const modalOverlay = document.getElementById('section-feedback-modal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeFeedbackModal();
                }
            });
        }
    }
    
    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.sessionId}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            if (this.isResearching) {
                this.showError('Connection lost. Please refresh the page and try again.');
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (this.isResearching) {
                this.showError('Connection error. Please check your internet connection.');
            }
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status':
                this.updateProgress(data);
                break;
            case 'thinking':
                this.showThinking(data);
                break;
            case 'complete':
                this.showResults(data);
                break;
            case 'section_complete':
                this.handleSectionRegeneration(data);
                break;
            case 'error':
                this.showError(data.message);
                break;
        }
    }
    
    startResearch() {
        const topicInput = document.getElementById('topic-input');
        const topic = topicInput.value.trim();
        
        if (!topic) {
            this.showToast('Please enter an analysis topic', 'error');
            return;
        }
        
        if (this.isResearching) {
            return;
        }
        
        this.currentTopic = topic;
        this.isResearching = true;
        this.isFinalizingMode = false; // Reset finalizing mode flag
        
        // Update UI
        this.showSection('progress-section');
        this.hideSection('input-section');
        this.hideSection('results-section');
        this.hideSection('error-section');
        
        // Reset progress
        this.resetProgress();
        
        // Clear any previous query details
        this.clearQueryDetails();
        
        // Send analysis request
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'start_research',
                topic: topic
            }));
        } else {
            this.showError('Connection not ready. Please refresh the page and try again.');
        }
    }
    
    updateProgress(data) {
        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        
        progressFill.style.width = `${data.progress}%`;
        progressPercent.textContent = `${data.progress}%`;
        
        // Update current step
        document.getElementById('current-step').textContent = this.getStepTitle(data.step);
        document.getElementById('status-message').textContent = data.message;
        
        // Show/hide floating AI thinking based on step
        if (data.step === 'complete' || data.progress >= 100) {
            this.isFinalizingMode = false;
            this.hideFloatingAIThinking();
            this.clearQueryDetails(); // Clear query details when complete
        } else if (data.step === 'finalizing') {
            this.isFinalizingMode = true;
            this.showFloatingAIThinking('AI is finalizing report');
            this.clearQueryDetails(); // Clear query details when finalizing
        } else if (!this.isFinalizingMode && (data.step === 'query_generation' || data.step === 'researching' || data.step === 'writing')) {
            // Only update section-specific animation if not in finalizing mode
            // Extract section name from message if available
            const sectionMatch = data.message.match(/section: (.+)$/);
            const sectionName = sectionMatch ? sectionMatch[1] : 'Current Section';
            this.showFloatingAIThinking(`Analyzing ${sectionName}`);
        } else if (data.step === 'regenerating') {
            this.showFloatingAIThinking('AI is regenerating section');
        } else if (data.step === 'planning') {
            this.showFloatingAIThinking('AI is planning research');
        }
        
        // Update step status
        this.updateStepStatus(data.step);
        
        // Clear thinking content when new status arrives
        this.clearThinking();
        
        // Show detailed info if available (but respect finalizing mode)
        if (data.details && !this.isFinalizingMode) {
            this.showDetailedProgress(data.details);
        }
    }
    
    showThinking(data) {
        const thinkingContainer = document.getElementById('thinking-container');
        const thinkingContent = document.getElementById('thinking-content');
        
        if (thinkingContainer && thinkingContent) {
            thinkingContent.innerHTML = this.formatThinkingContent(data.message);
            thinkingContainer.style.display = 'block';
            
            // Add typing animation
            thinkingContainer.classList.add('thinking-active');
            
            // Auto-scroll to thinking content
            thinkingContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    clearThinking() {
        const thinkingContainer = document.getElementById('thinking-container');
        if (thinkingContainer) {
            thinkingContainer.classList.remove('thinking-active');
            // Don't hide immediately to maintain reading experience
            setTimeout(() => {
                if (!thinkingContainer.classList.contains('thinking-active')) {
                    thinkingContainer.style.display = 'none';
                }
            }, 1000);
        }
    }
    
    formatThinkingContent(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/^• /gm, '<span class="bullet">•</span> ');
    }
    
    showDetailedProgress(details) {
        if (details.sections) {
            this.updateSectionsList(details.sections);
        }
        if (details.queries && details.section_name) {
            // Show floating AI thinking animation with the same section name
            this.showFloatingAIThinking(`Analyzing ${details.section_name}`);
            
            // Show AI thinking animation
            this.showThinking({
                message: `Analyzing **${details.section_name}**\n\n• Generating targeted search queries\n• Gathering information from reliable sources\n• Processing research data`
            });
            
            // Show query details with the same section name
            this.showQueryDetails(details.section_name, details.queries);
        }
    }
    
    showFloatingAIThinking(text) {
        const floatingThinking = document.getElementById('floating-ai-thinking');
        const thinkingText = document.getElementById('ai-thinking-text');
        
        if (floatingThinking && thinkingText) {
            thinkingText.textContent = text;
            floatingThinking.style.display = 'flex';
        }
    }
    
    hideFloatingAIThinking() {
        const floatingThinking = document.getElementById('floating-ai-thinking');
        if (floatingThinking) {
            floatingThinking.style.display = 'none';
        }
    }
    
    updateSectionsList(sections) {
        const sectionsContainer = document.getElementById('sections-preview');
        if (sectionsContainer) {
            let sectionsArray = [];
            
            // Handle both array and object formats
            if (Array.isArray(sections)) {
                sectionsArray = sections;
            } else if (typeof sections === 'object' && sections !== null) {
                // Convert object to array format
                sectionsArray = Object.entries(sections).map(([name, description]) => ({
                    name: name,
                    description: description
                }));
            }
            
            if (sectionsArray.length > 0) {
                sectionsContainer.innerHTML = sectionsArray.map(section => 
                    `<div class="section-preview">
                        <h4>${section.name}</h4>
                        <p>${section.description}</p>
                    </div>`
                ).join('');
                sectionsContainer.style.display = 'block';
            }
        }
    }
    
    showQueryDetails(sectionName, queries) {
        const queriesContainer = document.getElementById('current-queries');
        if (queriesContainer && sectionName) {
            queriesContainer.innerHTML = `
                <h4>🔍 Analyzing: ${sectionName}</h4>
                <ul class="query-list">
                    ${queries.map(query => `<li>${query}</li>`).join('')}
                </ul>
            `;
            queriesContainer.style.display = 'block';
        }
    }
    
    clearQueryDetails() {
        const queriesContainer = document.getElementById('current-queries');
        if (queriesContainer) {
            queriesContainer.innerHTML = '';
            queriesContainer.style.display = 'none';
        }
    }
    
    getStepTitle(step) {
        const titles = {
            'initializing': 'Initializing Analysis',
            'planning': 'Creating Analysis Plan',
            'planning_complete': 'Planning Complete',
            'query_generation': 'Generating Queries',
            'researching': 'Conducting Analysis',
            'writing': 'Writing Sections',
            'finalizing': 'Finalizing Report',
            'regenerating': 'Regenerating Section',
            'complete': 'Analysis Complete'
        };
        return titles[step] || 'Processing...';
    }
    
    updateStepStatus(currentStep) {
        // Reset all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
            step.querySelector('.step-status').textContent = '⏳';
        });
        
        const stepOrder = ['planning', 'query_generation', 'researching', 'writing', 'finalizing'];
        const currentIndex = stepOrder.findIndex(step => currentStep.includes(step));
        
        stepOrder.forEach((step, index) => {
            const stepElement = document.getElementById(`step-${step}`);
            if (index < currentIndex) {
                stepElement.classList.add('completed');
                stepElement.querySelector('.step-status').textContent = '✅';
            } else if (index === currentIndex) {
                stepElement.classList.add('active');
                stepElement.querySelector('.step-status').textContent = '🔄';
            }
        });
    }
    
    showResults(data) {
        this.isResearching = false;
        this.isFinalizingMode = false; // Reset finalizing mode flag
        
        // Hide floating AI thinking animation
        this.hideFloatingAIThinking();
        
        // Clear query details
        this.clearQueryDetails();
        
        // Store the final report
        this.finalReport = data.result.final_report;
        this.originalReport = data.result.final_report;
        
        // Update metadata
        document.getElementById('meta-topic').textContent = data.result.topic;
        document.getElementById('meta-sections').textContent = data.result.sections.length;
        document.getElementById('meta-timestamp').textContent = new Date(data.result.timestamp).toLocaleString();
        
        // Render markdown
        const renderedReport = document.getElementById('rendered-report');
        const htmlContent = this.renderMarkdown(data.result.final_report);
        if (renderedReport) {
            renderedReport.innerHTML = htmlContent;
        }
        
        // Store the raw markdown for edit functionality
        this.rawMarkdown = data.result.final_report;
        
        // Show results
        this.hideSection('progress-section');
        this.showSection('results-section');
        
        // Complete all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
            step.classList.add('completed');
            step.querySelector('.step-status').textContent = '✅';
        });
        
        // Setup section event listeners now that the results section is visible
        setTimeout(() => {
            this.setupSectionEventListeners();
        }, 1000);
        
        this.showToast('Research completed successfully!', 'success');
    }
    
    renderMarkdown(markdown) {
        const rawMarkdown = document.getElementById('raw-markdown');
        
        // Render markdown to HTML
        const htmlContent = marked.parse(markdown);
        
        // Set raw markdown if element exists
        if (rawMarkdown) {
            rawMarkdown.textContent = markdown;
            
            // Highlight code if Prism is available
            if (typeof Prism !== 'undefined') {
                Prism.highlightElement(rawMarkdown);
            }
        }
        
        return htmlContent;
    }
    
    showError(message) {
        this.isResearching = false;
        
        document.getElementById('error-message').textContent = message;
        this.hideSection('progress-section');
        this.showSection('error-section');
        
        this.showToast(message, 'error');
    }
    
    resetProgress() {
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-percent').textContent = '0%';
        document.getElementById('current-step').textContent = 'Initializing...';
        document.getElementById('status-message').textContent = 'Starting analysis process...';
        
        // Reset all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
            step.querySelector('.step-status').textContent = '⏳';
        });
    }
    
    copyReport() {
        if (!this.finalReport) {
            this.showToast('No report to copy', 'error');
            return;
        }
        
        navigator.clipboard.writeText(this.finalReport).then(() => {
            this.showToast('Report copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy report', 'error');
        });
    }
    
    downloadReport() {
        if (!this.finalReport) {
            this.showToast('No report to download', 'error');
            return;
        }
        
        const blob = new Blob([this.finalReport], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `insights_report_${this.currentTopic.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Report downloaded!', 'success');
    }
    
    resetApp() {
        // Reset state
        this.isResearching = false;
        this.currentTopic = '';
        this.finalReport = '';
        this.originalReport = '';
        this.hasUnsavedChanges = false;
        this.isFinalizingMode = false; // Reset finalizing mode flag
        
        // Hide floating AI thinking animation
        this.hideFloatingAIThinking();
        
        // Clear query details
        this.clearQueryDetails();
        
        // Reset UI
        this.showSection('input-section');
        this.hideSection('progress-section');
        this.hideSection('results-section');
        this.hideSection('error-section');
        
        // Clear input
        document.getElementById('topic-input').value = '';
        
        // Reset progress
        this.resetProgress();
        
        // Exit any special modes
        this.exitEditMode();
        this.exitSectionMode();
    }
    
    retryResearch() {
        this.hideSection('error-section');
        this.startResearch();
    }
    
    toggleRawMarkdown() {
        const renderedReport = document.getElementById('rendered-report');
        const rawReport = document.getElementById('raw-report');
        const toggleBtn = document.getElementById('toggle-raw-btn');
        
        if (rawReport.style.display === 'none') {
            renderedReport.style.display = 'none';
            rawReport.style.display = 'block';
            toggleBtn.textContent = 'View Rendered';
        } else {
            renderedReport.style.display = 'block';
            rawReport.style.display = 'none';
            toggleBtn.textContent = 'View Raw Markdown';
        }
    }
    
    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.classList.add('fade-in');
        }
    }
    
    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
            section.classList.remove('fade-in');
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            animation: 'slideInRight 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        toast.style.background = colors[type] || colors.info;
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // Edit Mode Methods
    toggleEditMode() {
        const editModeBtn = document.getElementById('edit-mode-btn');
        const editControls = document.getElementById('edit-controls');
        const reportContainer = document.querySelector('.report-container');
        const renderedReport = document.getElementById('rendered-report');
        
        if (!this.isEditMode) {
            // Enter edit mode
            this.isEditMode = true;
            this.originalReport = renderedReport.innerHTML;
            this.hasUnsavedChanges = false;
            
            // Update UI
            editModeBtn.classList.add('active');
            editModeBtn.innerHTML = '<span class="edit-icon">✅</span> Edit Mode';
            editControls.style.display = 'block';
            reportContainer.classList.add('edit-mode');
            
            // Make content editable
            renderedReport.contentEditable = 'true';
            renderedReport.focus();
            
            // Add input listener for unsaved changes
            renderedReport.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                this.updateEditStatus();
            });
            
            this.showToast('Edit mode activated! Click anywhere in the report to modify content.', 'success');
        } else {
            // Exit edit mode
            this.exitEditMode();
        }
    }
    
    exitEditMode() {
        const editModeBtn = document.getElementById('edit-mode-btn');
        const editControls = document.getElementById('edit-controls');
        const reportContainer = document.querySelector('.report-container');
        const renderedReport = document.getElementById('rendered-report');
        
        this.isEditMode = false;
        
        // Update UI
        editModeBtn.classList.remove('active');
        editModeBtn.innerHTML = '<span class="edit-icon">✏️</span> Edit Mode';
        editControls.style.display = 'none';
        reportContainer.classList.remove('edit-mode');
        
        // Make content non-editable
        renderedReport.contentEditable = 'false';
        
        // Remove input listeners
        renderedReport.replaceWith(renderedReport.cloneNode(true));
    }
    
    saveEdits() {
        if (!this.hasUnsavedChanges) {
            this.showToast('No changes to save', 'info');
            return;
        }
        
        const renderedReport = document.getElementById('rendered-report');
        const editedContent = renderedReport.innerHTML;
        
        // Convert HTML back to markdown (basic conversion)
        const markdownContent = this.convertHtmlToMarkdown(editedContent);
        
        // Update the stored report
        this.finalReport = markdownContent;
        this.originalReport = editedContent;
        this.hasUnsavedChanges = false;
        
        // Update raw markdown view
        document.getElementById('raw-markdown').textContent = markdownContent;
        
        this.updateEditStatus();
        this.showToast('Changes saved successfully!', 'success');
    }
    
    cancelEdits() {
        if (this.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }
        
        const renderedReport = document.getElementById('rendered-report');
        renderedReport.innerHTML = this.originalReport;
        
        this.hasUnsavedChanges = false;
        this.updateEditStatus();
        this.exitEditMode();
        
        this.showToast('Changes cancelled', 'info');
    }
    
    resetReport() {
        if (!confirm('Are you sure you want to reset the report to its original content? This will lose all edits.')) {
            return;
        }
        
        // Re-render from original markdown
        this.renderMarkdown(this.finalReport);
        this.originalReport = document.getElementById('rendered-report').innerHTML;
        this.hasUnsavedChanges = false;
        
        this.updateEditStatus();
        this.showToast('Report reset to original content', 'info');
    }
    
    updateEditStatus() {
        const saveBtn = document.getElementById('save-edits-btn');
        const editIndicator = document.querySelector('.edit-indicator');
        
        if (this.hasUnsavedChanges) {
            saveBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            saveBtn.innerHTML = '<span>💾</span> Save Changes*';
            editIndicator.innerHTML = '✏️ Edit Mode Active - You have unsaved changes';
            editIndicator.style.background = 'rgba(245, 158, 11, 0.1)';
            editIndicator.style.color = '#d97706';
            editIndicator.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        } else {
            saveBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            saveBtn.innerHTML = '<span>💾</span> Save Changes';
            editIndicator.innerHTML = '✏️ Edit Mode Active - Click anywhere in the report to modify content';
            editIndicator.style.background = 'rgba(34, 197, 94, 0.1)';
            editIndicator.style.color = '#059669';
            editIndicator.style.borderColor = 'rgba(34, 197, 94, 0.2)';
        }
    }
    
    convertHtmlToMarkdown(html) {
        // Basic HTML to Markdown conversion
        let markdown = html
            // Headers
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
            
            // Bold and italic
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            
            // Lists
            .replace(/<ul[^>]*>/gi, '')
            .replace(/<\/ul>/gi, '\n')
            .replace(/<ol[^>]*>/gi, '')
            .replace(/<\/ol>/gi, '\n')
            .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
            
            // Paragraphs
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            
            // Line breaks
            .replace(/<br\s*\/?>/gi, '\n')
            
            // Remove any remaining HTML tags
            .replace(/<[^>]*>/g, '')
            
            // Clean up extra whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
            
        return markdown;
    }
    
    // Section Regeneration Methods
    toggleSectionMode() {
        const sectionRegenBtn = document.getElementById('section-regen-btn');
        const sectionControls = document.getElementById('section-regen-controls');
        const reportContainer = document.querySelector('.report-container');
        
        if (!sectionRegenBtn || !sectionControls || !reportContainer) {
            console.error('Section mode elements not found:', { 
                sectionRegenBtn: !!sectionRegenBtn, 
                sectionControls: !!sectionControls, 
                reportContainer: !!reportContainer 
            });
            this.showToast('Section mode not available yet. Please generate a report first.', 'error');
            return;
        }
        
        if (!this.isSectionMode) {
            // Enter section mode
            this.isSectionMode = true;
            
            // Exit edit mode if active
            if (this.isEditMode) {
                this.exitEditMode();
            }
            
            // Update UI
            sectionRegenBtn.classList.add('active');
            sectionRegenBtn.innerHTML = '<span class="regen-icon">✅</span> Section Mode';
            sectionControls.style.display = 'block';
            reportContainer.classList.add('section-mode');
            
            // Add click listeners to section headers
            this.addSectionClickListeners();
            
            this.showToast('Section mode activated! Click on any section heading to improve it.', 'success');

        } else {
            // Exit section mode
            this.exitSectionMode();
        }
    }
    
    exitSectionMode() {
        const sectionRegenBtn = document.getElementById('section-regen-btn');
        const sectionControls = document.getElementById('section-regen-controls');
        const reportContainer = document.querySelector('.report-container');
        
        this.isSectionMode = false;
        
        // Update UI
        sectionRegenBtn.classList.remove('active');
        sectionRegenBtn.innerHTML = '<span class="regen-icon">🔄</span> Improve Sections';
        sectionControls.style.display = 'none';
        reportContainer.classList.remove('section-mode');
        
        // Remove click listeners
        this.removeSectionClickListeners();
        
        // Close modal if open
        this.closeFeedbackModal();
    }
    
    addSectionClickListeners() {
        const headers = document.querySelectorAll('#rendered-report h1, #rendered-report h2, #rendered-report h3, #rendered-report h4, #rendered-report h5, #rendered-report h6');
        
        if (headers.length === 0) {
            setTimeout(() => this.addSectionClickListeners(), 500);
            return;
        }
        
        headers.forEach(header => {
            // Add visual indication that headers are clickable
            header.style.cursor = 'pointer';
            header.style.transition = 'background-color 0.2s ease';
            header.classList.add('section-clickable');
            
            // Add click listener
            header.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleSectionClick(e);
            });
            
            // Add hover effects
            header.addEventListener('mouseenter', () => {
                if (this.isSectionMode) {
                    header.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                }
            });
            
            header.addEventListener('mouseleave', () => {
                header.style.backgroundColor = '';
            });
        });
    }
    
    removeSectionClickListeners() {
        const headers = document.querySelectorAll('#rendered-report h1, #rendered-report h2, #rendered-report h3, #rendered-report h4, #rendered-report h5, #rendered-report h6');
        headers.forEach(header => {
            // Remove visual styling
            header.style.cursor = '';
            header.style.backgroundColor = '';
            header.classList.remove('section-clickable');
            
            // Clone to remove all event listeners
            header.replaceWith(header.cloneNode(true));
        });
    }
    
    handleSectionClick(event) {
        if (!this.isSectionMode) {
            return;
        }
        
        const header = event.target;
        const sectionContent = this.extractSectionContent(header);
        
        this.selectedSection = header;
        this.sectionContent = sectionContent;
        
        this.showFeedbackModal(header.textContent, sectionContent);
    }
    
    extractSectionContent(header) {
        const content = [];
        let nextElement = header.nextElementSibling;
        
        // Get all content until the next header of same or higher level
        const headerLevel = parseInt(header.tagName.charAt(1));
        
        while (nextElement) {
            // Stop if we hit a header of same or higher level
            if (nextElement.tagName.match(/^H[1-6]$/)) {
                const nextLevel = parseInt(nextElement.tagName.charAt(1));
                if (nextLevel <= headerLevel) {
                    break;
                }
            }
            
            content.push(nextElement.textContent);
            nextElement = nextElement.nextElementSibling;
        }
        
        return content.join('\n\n').substring(0, 300) + (content.join('\n\n').length > 300 ? '...' : '');
    }
    
    showFeedbackModal(sectionTitle, sectionContent) {
        const modal = document.getElementById('section-feedback-modal');
        const preview = document.getElementById('selected-section-preview');
        const feedback = document.getElementById('section-feedback');
        
        preview.innerHTML = `<strong>${sectionTitle}</strong><br><br>${sectionContent}`;
        feedback.value = '';
        
        modal.style.display = 'flex';
        
        // Focus on feedback input
        setTimeout(() => feedback.focus(), 100);
    }
    
    closeFeedbackModal() {
        const modal = document.getElementById('section-feedback-modal');
        modal.style.display = 'none';
        this.selectedSection = null;
        this.sectionContent = '';
    }
    
    regenerateSection() {
        const feedback = document.getElementById('section-feedback').value.trim();
        
        if (!feedback) {
            this.showToast('Please provide feedback for the section improvement', 'error');
            return;
        }
        
        if (!this.selectedSection) {
            this.showToast('No section selected', 'error');
            return;
        }
        
        // Store section info BEFORE closing modal (which clears selectedSection)
        const sectionElement = this.selectedSection;
        const sectionTitle = this.selectedSection.textContent;
        const sectionContent = this.sectionContent;
        const currentTopic = this.currentTopic;
        
        // Close modal (this clears this.selectedSection)
        this.closeFeedbackModal();
        
        // Add regenerating visual indicator using stored reference
        sectionElement.classList.add('section-regenerating');
        
        // Store the section element for the response handler
        this.regeneratingSection = sectionElement;
        
        // Send section regeneration request
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'regenerate_section',
                section_title: sectionTitle,
                section_content: sectionContent,
                feedback: feedback,
                topic: currentTopic
            };
            
            this.ws.send(JSON.stringify(message));
            this.showToast('Regenerating section with your feedback...', 'info');
        } else {
            this.showError('Connection not ready. Please refresh the page and try again.');
        }
    }
    
    handleSectionRegeneration(data) {
        if (data.section_title && this.regeneratingSection) {
            // Remove regenerating indicator
            this.regeneratingSection.classList.remove('section-regenerating');
            
            if (data.success && data.new_content) {
                // Update the section content
                this.updateSectionContent(data.section_title, data.new_content);
                this.showToast('Section regenerated successfully!', 'success');
            } else {
                this.showToast('Failed to regenerate section: ' + (data.error || 'No content received'), 'error');
            }
            
            // Clear the regenerating section reference
            this.regeneratingSection = null;
        }
    }
    
    updateSectionContent(sectionTitle, newContent) {
        // First, update the stored markdown for consistency
        this.updateMarkdownWithNewSection(sectionTitle, newContent);
        
        // Try direct HTML section replacement instead of full re-render
        const renderedReport = document.getElementById('rendered-report');
        if (!renderedReport) {
            this.showToast('Error finding report element', 'error');
            return;
        }
        
        try {
            // Find the section header in the current DOM
            const headers = renderedReport.querySelectorAll('h1, h2, h3, h4, h5, h6');
            let targetHeader = null;
            
            for (let header of headers) {
                const headerText = header.textContent.trim();
                if (headerText === sectionTitle.trim() || 
                    headerText.includes(sectionTitle.trim()) || 
                    sectionTitle.trim().includes(headerText)) {
                    targetHeader = header;
                    break;
                }
            }
            
            if (!targetHeader) {
                this.fallbackFullRerender();
                return;
            }
            
            // Find all content between this header and the next header at same or higher level
            let currentElement = targetHeader.nextElementSibling;
            const elementsToReplace = [];
            const headerLevel = parseInt(targetHeader.tagName.substring(1)); // H1 -> 1, H2 -> 2, etc.
            
            while (currentElement) {
                // Check if this is a header of same or higher level (lower number)
                if (currentElement.tagName.match(/^H[1-6]$/)) {
                    const currentLevel = parseInt(currentElement.tagName.substring(1));
                    if (currentLevel <= headerLevel) {
                        break; // Found the next section
                    }
                }
                elementsToReplace.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }
            
            // Convert the new markdown content to HTML
            if (typeof marked === 'undefined') {
                this.showToast('Markdown parser not available', 'error');
                return;
            }
            
            // Strip code fence wrapper if present
            let cleanContent = newContent.trim();
            if (cleanContent.startsWith('```markdown\n')) {
                cleanContent = cleanContent.replace(/^```markdown\n/, '').replace(/\n```$/, '');
            } else if (cleanContent.startsWith('```\n')) {
                cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
            }
             
             // Now try with actual content
             const newHtml = marked.parse(cleanContent);
             
             // Check if the conversion actually worked (more precise check)
             const hasMarkdownSyntax = newHtml.includes('####') || newHtml.includes('**') || newHtml.includes('*');
             const hasHtmlTags = newHtml.includes('<h') || newHtml.includes('<p>') || newHtml.includes('<strong>');
             const conversionFailed = hasMarkdownSyntax && !hasHtmlTags;
             
             if (conversionFailed || newHtml === newContent) {
                 // Fall back to full re-render instead of returning
                 this.fallbackFullRerender();
                 return;
             }
            
            // Create a temporary div to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtml;
            
            // Remove the first header if it matches our section (avoid duplicate)
            const firstChild = tempDiv.firstElementChild;
            if (firstChild && firstChild.tagName.match(/^H[1-6]$/) && 
                (firstChild.textContent.includes(sectionTitle) || sectionTitle.includes(firstChild.textContent))) {
                firstChild.remove();
            }
            
            // Remove old section content
            elementsToReplace.forEach(el => el.remove());
            
            // Insert new content after the header
            let insertAfter = targetHeader;
            while (tempDiv.firstChild) {
                const newElement = tempDiv.firstChild;
                insertAfter.parentNode.insertBefore(newElement, insertAfter.nextSibling);
                insertAfter = newElement;
            }
            
            // Re-add section click listeners if needed
            if (this.isSectionMode) {
                setTimeout(() => this.addSectionClickListeners(), 100);
            }
            
            this.showToast('Section updated successfully!', 'success');
            
        } catch (error) {
            this.fallbackFullRerender();
        }
    }
    
    fallbackFullRerender() {
        const renderedReport = document.getElementById('rendered-report');
        
        try {
            const htmlContent = this.renderMarkdown(this.finalReport);
            renderedReport.innerHTML = htmlContent;
            
            if (this.isSectionMode) {
                setTimeout(() => this.addSectionClickListeners(), 200);
            }
            
            this.showToast('Section updated successfully!', 'success');
        } catch (error) {
            this.showToast('Error updating section: ' + error.message, 'error');
        }
    }
    
    updateMarkdownWithNewSection(sectionTitle, newContent) {
        // Safety check - if new content is too large, it might be the entire report
        if (newContent.length > this.finalReport.length * 0.8) {
            this.showToast('Section update failed - received unexpected content format', 'error');
            return;
        }
        
        const lines = this.finalReport.split('\n');
        let startIndex = -1;
        let endIndex = -1;
        let headerLevel = 0;
        
        // Find section start - look for EXACT header match
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Look for markdown headers
            const headerMatch = line.match(/^(#+)\s*(.+)/);
            if (headerMatch) {
                const title = headerMatch[2].trim();
                // Use exact match or very close match
                if (title === sectionTitle.trim()) {
                    startIndex = i;
                    headerLevel = headerMatch[1].length;
                    break;
                }
            }
        }
        
        // If exact match not found, try fuzzy match as fallback
        if (startIndex === -1) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const headerMatch = line.match(/^(#+)\s*(.+)/);
                if (headerMatch) {
                    const title = headerMatch[2].trim();
                    // Fuzzy match - check if section title is contained in header
                    if (title.toLowerCase().includes(sectionTitle.trim().toLowerCase()) || 
                        sectionTitle.trim().toLowerCase().includes(title.toLowerCase())) {
                        startIndex = i;
                        headerLevel = headerMatch[1].length;
                        break;
                    }
                }
            }
        }
        
        if (startIndex === -1) {
            this.showToast('Could not locate section to update', 'error');
            return;
        }
        
        // Find section end (next header of same or higher level)
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            const nextHeaderMatch = line.match(/^(#+)/);
            if (nextHeaderMatch && nextHeaderMatch[1].length <= headerLevel) {
                endIndex = i;
                break;
            }
        }
        
        if (endIndex === -1) {
            endIndex = lines.length;
        }
        
        // Safety check - ensure we're not replacing too much content
        const sectionLength = endIndex - startIndex;
        if (sectionLength > lines.length * 0.7) {
            this.showToast('Section boundaries unclear - update cancelled for safety', 'error');
            return;
        }
        
        // Clean the new content - ensure it doesn't include the header again
        let cleanNewContent = newContent.trim();
        const newContentLines = cleanNewContent.split('\n');
        
        // Remove any headers that match our section from the new content
        let contentStartIndex = 0;
        for (let i = 0; i < Math.min(3, newContentLines.length); i++) {
            const line = newContentLines[i].trim();
            if (line.match(/^#+/) && (line.includes(sectionTitle) || 
                sectionTitle.includes(line.replace(/^#+\s*/, '')))) {
                contentStartIndex = i + 1;
            }
        }
        
        if (contentStartIndex > 0) {
            cleanNewContent = newContentLines.slice(contentStartIndex).join('\n').trim();
        }
        
        // Final safety check on cleaned content
        if (!cleanNewContent || cleanNewContent.length < 10) {
            this.showToast('Generated content appears invalid', 'error');
            return;
        }
        
        // Replace section content
        const beforeSection = lines.slice(0, startIndex + 1); // Keep the original header
        const afterSection = lines.slice(endIndex);
        const newSectionLines = cleanNewContent.split('\n');
        
        // Combine everything
        this.finalReport = [
            ...beforeSection,
            '',
            ...newSectionLines,
            '',
            ...afterSection
        ].join('\n');
        
        // Update raw markdown view
        const rawMarkdownElement = document.getElementById('raw-markdown');
        if (rawMarkdownElement) {
            rawMarkdownElement.textContent = this.finalReport;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InsightsApp();
});

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style); 