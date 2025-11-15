class RealVideoDownloader {
    constructor() {
        this.videoUrlInput = document.getElementById('videoUrl');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.resultSection = document.getElementById('result');
        this.loadingSection = document.getElementById('loading');
        this.errorSection = document.getElementById('error');
        this.platformIcons = document.querySelectorAll('.platform-icon');
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
        
        this.videoUrlInput.addEventListener('input', () => {
            this.validateUrl();
        });

        this.videoUrlInput.addEventListener('paste', () => {
            setTimeout(() => this.validateUrl(), 100);
        });

        this.videoUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleDownload();
            }
        });

        this.platformIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                const platform = icon.getAttribute('data-platform');
                this.setPlatformPlaceholder(platform);
            });
        });
    }

    setPlatformPlaceholder(platform) {
        const placeholders = {
            tiktok: 'https://www.tiktok.com/@username/video/123456789',
            instagram: 'https://www.instagram.com/reel/ABC1234567/',
            twitter: 'https://twitter.com/user/status/123456789',
            youtube: 'https://youtube.com/watch?v=ABC1234567'
        };
        this.videoUrlInput.placeholder = `Contoh: ${placeholders[platform]}`;
        this.videoUrlInput.focus();
    }

    validateUrl() {
        const url = this.videoUrlInput.value.trim();
        const isValid = this.isValidUrl(url);
        this.downloadBtn.disabled = !isValid;
        
        if (isValid) {
            this.videoUrlInput.style.borderColor = '#4CAF50';
        } else if (url.length > 0) {
            this.videoUrlInput.style.borderColor = '#f44336';
        } else {
            this.videoUrlInput.style.borderColor = '#e1e5e9';
        }
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return this.isSupportedPlatform(url.hostname);
        } catch (_) {
            return false;
        }
    }

    isSupportedPlatform(hostname) {
        const supportedPlatforms = [
            'tiktok.com', 'vm.tiktok.com',
            'instagram.com', 'www.instagram.com',
            'twitter.com', 'x.com',
            'youtube.com', 'www.youtube.com', 'youtu.be'
        ];
        return supportedPlatforms.some(platform => hostname.includes(platform));
    }

    async handleDownload() {
        const videoUrl = this.videoUrlInput.value.trim();
        
        if (!this.isValidUrl(videoUrl)) {
            this.showError('URL tidak valid atau platform tidak didukung');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResult();

        try {
            const videoData = await this.getVideoInfo(videoUrl);
            this.displayVideoInfo(videoData);
        } catch (error) {
            console.error('Download error:', error);
            this.showError(error.message || 'Gagal memproses video. Coba lagi atau gunakan video lain.');
        } finally {
            this.hideLoading();
        }
    }

    async getVideoInfo(videoUrl) {
        const platform = this.detectPlatform(videoUrl);
        
        switch (platform) {
            case 'tiktok':
                return await this.getTikTokInfo(videoUrl);
            case 'instagram':
                return await this.getInstagramInfo(videoUrl);
            case 'twitter':
                return await this.getTwitterInfo(videoUrl);
            case 'youtube':
                return await this.getYouTubeInfo(videoUrl);
            default:
                throw new Error('Platform tidak didukung');
        }
    }

    detectPlatform(url) {
        const hostname = new URL(url).hostname;
        if (hostname.includes('tiktok')) return 'tiktok';
        if (hostname.includes('instagram')) return 'instagram';
        if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter';
        if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'youtube';
        return 'unknown';
    }

    // TIKTOK - FIXED dengan multiple API fallback
    async getTikTokInfo(url) {
        const apis = [
            {
                name: 'TikTok API 1',
                url: `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`
            },
            {
                name: 'TikTok API 2', 
                url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`
            },
            {
                name: 'TikTok API 3',
                url: `https://tikdown.org/api?url=${encodeURIComponent(url)}`
            }
        ];

        for (const api of apis) {
            try {
                console.log(`Mencoba ${api.name}...`);
                const response = await this.fetchWithCorsProxy(api.url);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                console.log('API Response:', data);

                // Cek berbagai format response
                let videoUrl, title, thumbnail, author;

                if (data.videos) {
                    // Format Tiklydown
                    videoUrl = data.videos.hd || data.videos.sd || data.videos.wm;
                    title = data.title;
                    thumbnail = data.cover;
                    author = data.author?.nickname;
                } else if (data.data) {
                    // Format TikWM
                    videoUrl = data.data.play || data.data.wmplay;
                    title = data.data.title;
                    thumbnail = data.data.cover;
                    author = data.data.author?.nickname;
                } else if (data.url) {
                    // Format langsung
                    videoUrl = data.url;
                    title = data.title || 'TikTok Video';
                    thumbnail = data.thumbnail;
                    author = data.author;
                }

                if (videoUrl) {
                    return {
                        success: true,
                        title: title || 'TikTok Video',
                        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=300&h=200&fit=crop',
                        duration: 'Unknown',
                        platform: 'TikTok',
                        author: author || 'TikTok User',
                        downloadUrl: videoUrl,
                        filename: `tiktok_${Date.now()}.mp4`
                    };
                }
            } catch (error) {
                console.log(`${api.name} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('Semua API TikTok gagal. Coba lagi nanti.');
    }

    // INSTAGRAM
    async getInstagramInfo(url) {
        try {
            const apiUrl = `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`;
            const response = await this.fetchWithCorsProxy(apiUrl);
            
            if (!response.ok) throw new Error('API tidak merespon');

            const data = await response.json();
            
            if (!data.media) {
                throw new Error('Video tidak ditemukan');
            }

            return {
                success: true,
                title: data.title || 'Instagram Video',
                thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=200&fit=crop',
                duration: 'Unknown',
                platform: 'Instagram',
                author: data.author || 'Instagram User',
                downloadUrl: data.media,
                filename: `instagram_${Date.now()}.mp4`
            };
        } catch (error) {
            throw new Error(`Instagram: ${error.message}`);
        }
    }

    // TWITTER
    async getTwitterInfo(url) {
        try {
            const apiUrl = `https://twitsave.com/info?url=${encodeURIComponent(url)}`;
            const response = await this.fetchWithCorsProxy(apiUrl);
            
            if (!response.ok) throw new Error('API tidak merespon');

            const data = await response.json();
            const videoUrl = data.videos?.[0]?.url || data.media;
            
            if (!videoUrl) throw new Error('Link download tidak ditemukan');

            return {
                success: true,
                title: data.title || 'Twitter Video',
                thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=300&h=200&fit=crop',
                duration: 'Unknown',
                platform: 'Twitter',
                author: data.author || 'Twitter User',
                downloadUrl: videoUrl,
                filename: `twitter_${Date.now()}.mp4`
            };
        } catch (error) {
            throw new Error(`Twitter: ${error.message}`);
        }
    }

    // YOUTUBE
    async getYouTubeInfo(url) {
        try {
            const videoId = this.getYouTubeId(url);
            if (!videoId) throw new Error('URL YouTube tidak valid');

            return {
                success: true,
                title: 'YouTube Video',
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                duration: 'Unknown',
                platform: 'YouTube',
                author: 'YouTube Channel',
                downloadUrl: `https://ytdl.shipit.workers.dev/?url=${encodeURIComponent(url)}`,
                filename: `youtube_${videoId}.mp4`
            };
        } catch (error) {
            throw new Error(`YouTube: ${error.message}`);
        }
    }

    // CORS PROXY SOLUTION
    async fetchWithCorsProxy(url) {
        const proxyUrls = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`,
            url // Coba langsung tanpa proxy
        ];

        for (const proxyUrl of proxyUrls) {
            try {
                console.log(`Mencoba proxy: ${proxyUrl}`);
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                    },
                    mode: 'cors'
                });

                if (response.ok) {
                    console.log(`Proxy berhasil: ${proxyUrl}`);
                    return response;
                }
            } catch (error) {
                console.log(`Proxy gagal: ${proxyUrl}`, error.message);
                continue;
            }
        }
        
        throw new Error('Semua proxy gagal');
    }

    getYouTubeId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : '';
    }

    formatDuration(seconds) {
        if (!seconds || seconds === 0) return 'Unknown';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    displayVideoInfo(videoData) {
        const thumbnail = document.getElementById('videoThumbnail');
        thumbnail.src = videoData.thumbnail;
        thumbnail.alt = videoData.title;
        thumbnail.onerror = () => {
            thumbnail.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300&h=200&fit=crop';
        };
        
        document.getElementById('videoTitle').textContent = videoData.title;
        document.getElementById('videoDuration').innerHTML = `<i class="fas fa-clock"></i> ${videoData.duration}`;
        document.getElementById('videoPlatform').innerHTML = `<i class="fas fa-globe"></i> ${videoData.platform}`;
        document.getElementById('videoAuthor').innerHTML = `<i class="fas fa-user"></i> ${videoData.author}`;
        
        const qualityOptions = document.getElementById('qualityOptions');
        qualityOptions.innerHTML = '';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'quality-btn';
        downloadBtn.innerHTML = `
            <i class="fas fa-download"></i>
            <strong>Download Sekarang</strong>
            <small>Klik untuk download langsung</small>
        `;
        downloadBtn.onclick = async () => {
            await this.directDownload(videoData.downloadUrl, videoData.filename, videoData.title);
        };
        
        qualityOptions.appendChild(downloadBtn);
        this.showResult();
    }

    async directDownload(downloadUrl, filename, title) {
        try {
            this.showLoading();
            this.showSuccessMessage('⏳ Memulai download...');
            
            console.log('Download URL:', downloadUrl);
            
            // Coba download via proxy dulu
            const response = await this.fetchWithCorsProxy(downloadUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('File kosong atau tidak valid');
            }
            
            // Download langsung
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || `video_${Date.now()}.mp4`;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(blobUrl);
            
            this.showSuccessMessage(`✅ Download "${title}" berhasil!`);
            
        } catch (error) {
            console.error('Direct download error:', error);
            
            // Fallback: buka di tab baru
            this.showSuccessMessage('⚠️ Membuka halaman download...');
            setTimeout(() => {
                window.open(downloadUrl, '_blank');
            }, 1000);
            
        } finally {
            this.hideLoading();
        }
    }

    showSuccessMessage(message) {
        const existingMessage = document.querySelector('.success-message');
        if (existingMessage) existingMessage.remove();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        this.resultSection.insertBefore(successDiv, this.resultSection.firstChild);
        
        setTimeout(() => {
            if (successDiv.parentNode) successDiv.remove();
        }, 5000);
    }

    showLoading() {
        this.loadingSection.classList.remove('hidden');
        this.downloadBtn.disabled = true;
        this.downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    }

    hideLoading() {
        this.loadingSection.classList.add('hidden');
        this.downloadBtn.disabled = false;
        this.downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    }

    showResult() {
        this.resultSection.classList.remove('hidden');
    }

    hideResult() {
        this.resultSection.classList.add('hidden');
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.errorSection.classList.remove('hidden');
    }

    hideError() {
        this.errorSection.classList.add('hidden');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new RealVideoDownloader();
    console.log('🎬 Fixed Video Downloader Ready!');
});