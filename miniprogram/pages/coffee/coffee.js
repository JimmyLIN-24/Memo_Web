// pages/coffee/coffee.js
Page({
  data: {
        activeTab: 'methods', // 'methods' or 'journal'
        
        // Data
    methods: [],
    visits: [],
        
        // Map
        mapLat: 31.2304, // Default Shanghai
        mapLng: 121.4737,
        mapMarkers: [],
        
        // Modal
        showModal: false,
        modalTitle: '',
        formType: '', // 'method' or 'journal'
        editingId: null,
    
        // Forms
        methodForm: {
            icon: '', name: '', summary: '', notes: '', rating: 5,
        metrics: []
    },
        journalForm: {
            name: '', date: '', location: '', beans: '', notes: '', photo: '', lat: null, lng: null
        },

        // User Context
        storageKeyPrefix: ''
    },

    onLoad: function() {
        this.checkUser();
        this.loadMethods();
        this.loadVisits();
        
        // Try to get current location for map center
        wx.getLocation({
            type: 'gcj02',
            success: (res) => {
                this.setData({
                    mapLat: res.latitude,
                    mapLng: res.longitude
                });
            },
            fail: () => {
                console.log('Location permission denied or failed');
            }
        });
    },

    checkUser: function() {
        const user = wx.getStorageSync('memo_current_user');
        if (user === 'Grace1013') {
            this.setData({ storageKeyPrefix: 'Grace1013_' });
        } else {
            this.setData({ storageKeyPrefix: '' });
        }
    },

    goBack: function() {
        wx.navigateBack();
  },

    switchTab: function(e) {
      this.setData({ activeTab: e.currentTarget.dataset.tab });
        if (e.currentTarget.dataset.tab === 'journal') {
            this.updateMapMarkers();
        }
  },

    // --- Methods Logic ---
    loadMethods: function() {
        const key = this.data.storageKeyPrefix + 'coffeeMethods';
        let methods = wx.getStorageSync(key);
        if (!methods || methods.length === 0) {
            // Default methods (only for default user, maybe also for Grace?)
            // Let's give Grace empty slate or defaults too
            methods = [
                {
                    id: '1', icon: '🍃', name: 'Kono滴滤法', summary: '经典三段式注水', notes: '口感醇厚顺滑', rating: 5,
                    metrics: [{label: '温度', value: '85°C'}, {label: '粉量', value: '25g'}, {label: '比例', value: '1:10'}]
                },
                {
                    id: '2', icon: '🧊', name: '冰手冲', summary: '热水萃取后快速冰镇', notes: '锁住香气，鲜活酸质', rating: 4,
                    metrics: [{label: '温度', value: '92°C'}, {label: '粉量', value: '25g'}, {label: '比例', value: '1:8'}]
                }
            ];
            // Don't auto-save defaults to storage to keep it clean, just use in-memory if empty? 
            // Better to save so they can edit/delete
            wx.setStorageSync(key, methods);
        }
        this.setData({ methods });
    },

    showMethodForm: function() {
        this.setData({
            showModal: true,
            modalTitle: '新增冲煮方式',
            formType: 'method',
            editingId: null,
            methodForm: { icon: '☕', name: '', summary: '', notes: '', rating: 5, metrics: [{label: '温度', value: ''}, {label: '时间', value: ''}] }
        });
    },

    editMethod: function(e) {
        const id = e.currentTarget.dataset.id;
        const method = this.data.methods.find(m => m.id === id);
        this.setData({
            showModal: true,
            modalTitle: '编辑冲煮方式',
            formType: 'method',
            editingId: id,
            methodForm: JSON.parse(JSON.stringify(method))
        });
  },

    onMethodInput: function(e) {
      const field = e.currentTarget.dataset.field;
        this.setData({ [`methodForm.${field}`]: e.detail.value });
  },

    onMetricInput: function(e) {
        const index = e.currentTarget.dataset.index;
        const key = e.currentTarget.dataset.key;
        const metrics = this.data.methodForm.metrics;
        metrics[index][key] = e.detail.value;
        this.setData({ 'methodForm.metrics': metrics });
    },

    addMetric: function() {
        const metrics = this.data.methodForm.metrics;
        metrics.push({ label: '', value: '' });
        this.setData({ 'methodForm.metrics': metrics });
    },

    removeMetric: function(e) {
        const index = e.currentTarget.dataset.index;
        const metrics = this.data.methodForm.metrics;
        metrics.splice(index, 1);
        this.setData({ 'methodForm.metrics': metrics });
    },

    saveMethod: function() {
        const form = this.data.methodForm;
        if (!form.name) {
            wx.showToast({ title: '请输入名称', icon: 'none' });
            return;
        }

        const methods = this.data.methods;
        if (this.data.editingId) {
            const idx = methods.findIndex(m => m.id === this.data.editingId);
            if (idx > -1) methods[idx] = { ...form, id: this.data.editingId };
        } else {
            methods.unshift({ ...form, id: Date.now().toString() });
        }

        const key = this.data.storageKeyPrefix + 'coffeeMethods';
        wx.setStorageSync(key, methods);
        this.setData({ methods, showModal: false });
        wx.showToast({ title: '保存成功', icon: 'success' });
    },

    deleteMethod: function(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '确定要删除这个方式吗？',
            success: (res) => {
                if (res.confirm) {
                    const methods = this.data.methods.filter(m => m.id !== id);
                    const key = this.data.storageKeyPrefix + 'coffeeMethods';
                    wx.setStorageSync(key, methods);
                    this.setData({ methods });
                }
            }
        });
  },

    // --- Journal Logic ---
    loadVisits: function() {
        const key = this.data.storageKeyPrefix + 'cafeVisits';
        const visits = wx.getStorageSync(key) || [];
        this.setData({ visits });
        this.updateMapMarkers();
    },

    updateMapMarkers: function() {
        const markers = this.data.visits
            .filter(v => v.lat && v.lng)
            .map(v => ({
                id: parseInt(v.id.slice(-5)) || 0, // Simple ID gen
                latitude: v.lat,
                longitude: v.lng,
                title: v.name,
                iconPath: '/images/marker.png', // Fallback icon needed or generic
                width: 30,
                height: 30,
                callout: {
                    content: v.name,
                    padding: 10,
                    borderRadius: 5,
                    display: 'BYCLICK'
                }
            }));
        this.setData({ mapMarkers: markers });
  },

    showJournalForm: function() {
        const today = new Date().toISOString().split('T')[0];
        this.setData({
            showModal: true,
            modalTitle: '记录新探店',
            formType: 'journal',
            editingId: null,
            journalForm: { name: '', date: today, location: '', beans: '', notes: '', photo: '', lat: null, lng: null }
        });
    },

    onJournalInput: function(e) {
      const field = e.currentTarget.dataset.field;
        this.setData({ [`journalForm.${field}`]: e.detail.value });
    },
    
    onDateChange: function(e) {
        this.setData({ 'journalForm.date': e.detail.value });
  },

    chooseLocation: function() {
        const that = this;
      wx.chooseLocation({
            success: function(res) {
                that.setData({
                    'journalForm.location': res.name || res.address,
                    'journalForm.lat': res.latitude,
                    'journalForm.lng': res.longitude
              });
            },
            fail: function(err) {
                console.log('Choose location failed', err);
                wx.showToast({ title: '无法获取位置，请检查权限', icon: 'none' });
          }
      });
  },

    choosePhoto: function() {
        const that = this;
      wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: function(res) {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                // For persistence in a real app, upload this.
                // For this offline demo, we use saveFile to keep it locally as long as possible.
                wx.saveFile({
                    tempFilePath: tempFilePath,
                    success: function(savedRes) {
                        that.setData({
                            'journalForm.photo': savedRes.savedFilePath
                        });
                    }
              });
          }
      });
  },

    previewImage: function(e) {
        const src = e.currentTarget.dataset.src;
        wx.previewImage({
            urls: [src]
        });
    },

    saveJournal: function() {
        const form = this.data.journalForm;
        if (!form.name) {
            wx.showToast({ title: '请输入店名', icon: 'none' });
            return;
        }

        const visits = this.data.visits;
        const newVisit = { ...form, id: Date.now().toString() };
        visits.unshift(newVisit);

        const key = this.data.storageKeyPrefix + 'cafeVisits';
        wx.setStorageSync(key, visits);
        this.setData({ visits, showModal: false });
        this.updateMapMarkers();
        wx.showToast({ title: '已收藏', icon: 'success' });
    },

    deleteVisit: function(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '删除',
            content: '确定删除这条记录吗？',
            success: (res) => {
                if (res.confirm) {
                    const visits = this.data.visits.filter(v => v.id !== id);
                    const key = this.data.storageKeyPrefix + 'cafeVisits';
                    wx.setStorageSync(key, visits);
                    this.setData({ visits });
                    this.updateMapMarkers();
                }
            }
        });
    },

    closeModal: function() {
        this.setData({ showModal: false });
  }
});
