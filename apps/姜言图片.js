import plugin from '../../../lib/plugins/plugin.js';
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
    }

    async getRandomImage(e) {
        try {
            // await e.reply('正在获取，请稍等喵~');
            
            // 从API获取图片
            const response = await fetch('https://api.jiangtokoto.cn/memes/random');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // 获取图片的二进制数据
            const imageBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            
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