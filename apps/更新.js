import plugin from '../../../lib/plugins/plugin.js';
import { update as UpdateHandler } from "../../other/update.js"
export class Update extends plugin {
    constructor() {
        super({
            name: '[插件]更新插件',
            dsc: '更新插件',
            event: 'message',
            priority: 10,
            rule: [
                {
                    reg: /^#*姜言(小工具)?(插件)?(强制)?更新$/i,
                    fnc: 'update'
                },
            ]
        })
    }
    async update(e) {
        if (!e.isMaster) return;
        if (e.at && !e.atme) return;
        e.msg = `#${e.msg.includes("强制") ? "强制" : ""}更新Jiangtokoto-plugin`;
        const up = new UpdateHandler(e);
        up.e = e;
        return up.update();
    }
}