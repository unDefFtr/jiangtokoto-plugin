import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
export class JiangtokotoImage extends plugin {
    constructor() {
        super({
            name: '姜言图片',
            des: '获取姜言随机图片',
            event: 'message',
            rule: [{
                reg: /^(\/|#|!|！)(jiangtokoto|姜言)/i,
                fnc: 'getRandomImage'
            }],
        });
        
        // 创建缓存目录
        this.cacheDir = path.join(process.cwd(), 'data', 'jiangtokoto-cache');
        this.listFile = path.join(this.cacheDir, 'memes-list.json');
        this.syncTimeFile = path.join(this.cacheDir, 'last-sync-time.txt');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        
        // 初始化时检查并同步
        this.initializeCache();
    }
    
    async initializeCache() {
        try {
            // 如果本地列表不存在，先同步一次
            if (!fs.existsSync(this.listFile)) {
                await this.syncMemesList();
            }
        } catch (error) {
            logger.error(`[姜言图片] 初始化缓存失败: ${error.message}`);
        }
    }
    
    getLastSyncTime() {
        try {
            if (fs.existsSync(this.syncTimeFile)) {
                const timeStr = fs.readFileSync(this.syncTimeFile, 'utf8');
                return parseInt(timeStr) || 0;
            }
        } catch (error) {
            logger.error(`[姜言图片] 读取同步时间失败: ${error.message}`);
        }
        return 0;
    }
    
    setLastSyncTime(timestamp) {
        try {
            fs.writeFileSync(this.syncTimeFile, timestamp.toString());
        } catch (error) {
            logger.error(`[姜言图片] 保存同步时间失败: ${error.message}`);
        }
    }
    
    async syncMemesList() {
        try {
            // 更新同步时间戳
            const now = Date.now();
            this.setLastSyncTime(now);
            logger.info('[姜言图片] 开始同步表情包列表...');
            const response = await fetch('https://api.jiangtokoto.cn/memes/list');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const remoteList = await response.json();
            let localList = [];
            
            // 读取本地列表
            if (fs.existsSync(this.listFile)) {
                const localData = fs.readFileSync(this.listFile, 'utf8');
                localList = JSON.parse(localData);
            }
            
            // 找出新增的表情包
            const localIds = new Set(localList.map(item => item.id));
            const newMemes = remoteList.filter(item => !localIds.has(item.id));
            
            if (newMemes.length > 0) {
                logger.info(`[姜言图片] 发现 ${newMemes.length} 个新表情包，开始下载...`);
                
                // 下载新表情包
                for (const meme of newMemes) {
                    await this.downloadMeme(meme);
                }
                
                // 更新本地列表
                fs.writeFileSync(this.listFile, JSON.stringify(remoteList, null, 2));
                logger.info(`[姜言图片] 同步完成，共 ${remoteList.length} 个表情包`);
            } else {
                logger.info('[姜言图片] 表情包列表已是最新');
            }
            
        } catch (error) {
            logger.error(`[姜言图片] 同步列表失败: ${error.message}`);
        }
    }
    
    async downloadMeme(meme) {
        try {
            const ext = meme.mime_type === 'image/png' ? 'png' : 'jpg';
            const filePath = path.join(this.cacheDir, `${meme.id}.${ext}`);
            
            if (fs.existsSync(filePath)) {
                return; // 已存在，跳过
            }
            
            const response = await fetch(`https://api.jiangtokoto.cn/memes/get/${meme.id}`);
            
            if (!response.ok) {
                throw new Error(`下载失败: ${response.status}`);
            }
            
            const imageBuffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(imageBuffer));
            
            logger.info(`[姜言图片] 下载完成: ${meme.filename}`);
            
        } catch (error) {
            logger.error(`[姜言图片] 下载表情包 ${meme.id} 失败: ${error.message}`);
        }
    }

    async getRandomImage(e) {
        try {
            // 检查是否需要同步（距离上次同步超过5秒才同步）
            const now = Date.now();
            const lastSyncTime = this.getLastSyncTime();
            const timeSinceLastSync = now - lastSyncTime;
            const syncInterval = 5000; // 5秒间隔
            
            if (timeSinceLastSync >= syncInterval) {
                // 后台异步检查更新（不阻塞用户请求）
                this.syncMemesList().catch(err => {
                    logger.error(`[姜言图片] 后台同步失败: ${err.message}`);
                });
            } else {
                logger.info(`[姜言图片] 距离上次同步仅${Math.round(timeSinceLastSync/1000)}秒，跳过同步`);
            }
            
            // 读取本地表情包列表
            if (!fs.existsSync(this.listFile)) {
                await e.reply('表情包列表为空，正在初始化...');
                // 强制同步一次（忽略时间间隔）
                await this.syncMemesList();
                if (!fs.existsSync(this.listFile)) {
                    throw new Error('无法获取表情包列表');
                }
            }
            
            const localData = fs.readFileSync(this.listFile, 'utf8');
            const memesList = JSON.parse(localData);
            
            if (memesList.length === 0) {
                throw new Error('表情包列表为空');
            }
            
            // 随机选择一个表情包
            const randomIndex = Math.floor(Math.random() * memesList.length);
            const selectedMeme = memesList[randomIndex];
            
            // 构建本地文件路径
            const ext = selectedMeme.mime_type === 'image/png' ? 'png' : 'jpg';
            const localFilePath = path.join(this.cacheDir, `${selectedMeme.id}.${ext}`);
            
            // 检查本地文件是否存在
            if (!fs.existsSync(localFilePath)) {
                logger.info(`[姜言图片] 本地文件不存在，重新下载: ${selectedMeme.filename}`);
                await this.downloadMeme(selectedMeme);
                
                if (!fs.existsSync(localFilePath)) {
                    throw new Error(`下载文件失败: ${selectedMeme.filename}`);
                }
            }
            
            // 读取本地文件并发送
            const imageData = fs.readFileSync(localFilePath);
            const base64Image = imageData.toString('base64');
            
            logger.info(`[姜言图片] 发送表情包: ${selectedMeme.filename}`);
            await e.reply(segment.image(`base64://${base64Image}`));
            
        } catch (error) {
            logger.error(`[姜言图片] 获取图片失败: ${error.message}`);
            
            let errorMsg = '获取失败，原因：';
            if (error.message.includes('HTTP error! status:')) {
                const status = error.message.match(/status: (\d+)/)?.[1];
                const statusMessages = {
                    '404': '资源不存在',
                    '500': '服务器内部错误',
                    '502': '服务器不可用',
                    '503': '服务暂时不可用',
                    '504': '网关超时'
                };
                errorMsg += statusMessages[status] || `HTTP ${status} 错误`;
            } else if (error.message.includes('fetch')) {
                errorMsg += '网络连接失败';
            } else if (error.message.includes('timeout')) {
                errorMsg += '连接超时';
            } else {
                errorMsg += error.message || '未知错误';
            }
            errorMsg += "喵~";
            
            await e.reply(errorMsg);
        }
    }
}