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
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    async getRandomImage(e) {
        try {
            await e.reply('正在获取姜言图片...');
            
            // 使用redirect=true获取固定URL
            const redirectResponse = await fetch('https://api.jiangtokoto.cn/memes/random?redirect=true');
            
            if (!redirectResponse.ok) {
                throw new Error(`HTTP error! status: ${redirectResponse.status}`);
            }
            
            // 获取最终的URL（已经重定向后的URL）
            const redirectUrl = redirectResponse.url;
            logger.info(`[姜言图片] 重定向URL: ${redirectUrl}`);
            
            // 从URL中提取图片ID
            const imageId = redirectUrl.split('/').pop();
            const cacheFilePath = path.join(this.cacheDir, `${imageId}.jpg`);
            
            let base64Image;
            
            // 检查本地缓存
            if (fs.existsSync(cacheFilePath)) {
                logger.info(`[姜言图片] 使用缓存图片: ${imageId}`);
                const cachedImage = fs.readFileSync(cacheFilePath);
                base64Image = cachedImage.toString('base64');
            } else {
                logger.info(`[姜言图片] 下载新图片: ${imageId}`);
                // 直接使用已经获取的响应数据
                const imageBuffer = await redirectResponse.arrayBuffer();
                const imageData = Buffer.from(imageBuffer);
                
                // 保存到本地缓存
                fs.writeFileSync(cacheFilePath, imageData);
                base64Image = imageData.toString('base64');
            }
            
            // 发送图片
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
                errorMsg += '未知错误';
            }
            errorMsg += "喵~";
            
            await e.reply(errorMsg);
        }
    }
}