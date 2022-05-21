import fs from 'node:fs'
export default class VastDB extends Map {
    constructor(v) {
        super();
        this.filename = `${process.cwd()}/db/db.json`;
        this.views = v
        if (!fs.existsSync(this.filename)) {
            this.set({
                type: 'user',
                name: 'admin',
                pass: '01b613da484bee91c3f3806b52a6f40fd61ade874b5ffc0f62a2091cce38158b',
            });
            console.log('creating db');
        } else {
            const sf = JSON.parse(fs.readFileSync(this.filename, 'utf8'));
            sf.map(([k, v]) => {
                v.id = k;
                this.set(v);
            });
        }
    }
    query(q = () => false) {
        return [...this].filter(q).map(([k, v]) => v)
    }
    getView(name, param) {
        const res = [...this].filter(this.views[name](param));
        return res.map(([k, v]) => v);
    }
    set(arr) {
        if (!arr.push) arr = [arr];
        for (const o of arr) {
            if (!o.name || !o.type) return false;
            if (!o.id) o.id = o.type + ':' + o.name;
        }
        arr.map((o) => super.set(o.id, o));
        if(this.event) this.event(arr)
        this.save();
    }
    save() {
        fs.writeFileSync(this.filename, JSON.stringify([...this.entries()]));
    }
}
