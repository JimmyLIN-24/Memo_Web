// pages/christmas/christmas.js
Page({
  data: {
    wishes: [],
    newWish: '',
    snowflakes: [],
    canvasWidth: 0,
    canvasHeight: 0
  },

  onLoad() {
    const wishes = wx.getStorageSync('wishes') || [];
    this.setData({ wishes });
  },

  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#snowCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            const dpr = wx.getSystemInfoSync().pixelRatio;
            
            canvas.width = res[0].width * dpr;
            canvas.height = res[0].height * dpr;
            ctx.scale(dpr, dpr);
    
            this.setData({ 
                canvasWidth: res[0].width, 
                canvasHeight: res[0].height 
            });
    
            this.initSnow(ctx, res[0].width, res[0].height);
        }
      });
  },

  initSnow(ctx, width, height) {
      let flakes = [];
      for(let i=0; i<50; i++) {
          flakes.push({
              x: Math.random() * width,
              y: Math.random() * height,
              r: Math.random() * 3 + 1,
              d: Math.random() * 50
          });
      }

      const draw = () => {
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.beginPath();
          for(let i = 0; i < flakes.length; i++) {
              let f = flakes[i];
              ctx.moveTo(f.x, f.y);
              ctx.arc(f.x, f.y, f.r, 0, Math.PI*2, true);
          }
          ctx.fill();
          this.moveSnow(flakes, width, height);
          
          canvas.requestAnimationFrame(draw);
      };
      
      const canvas = ctx.canvas;
      canvas.requestAnimationFrame(draw);
  },

  moveSnow(flakes, width, height) {
      for(let i = 0; i < flakes.length; i++) {
          let f = flakes[i];
          f.y += Math.pow(f.d, 0.5) * 0.1 + 1;
          f.x += Math.sin(0); 

          if(f.y > height) {
              flakes[i] = { x: Math.random() * width, y: 0, r: f.r, d: f.d };
          }
      }
  },

  bindInput(e) {
      this.setData({ newWish: e.detail.value });
  },

  addWish() {
      if(!this.data.newWish.trim()) return;
      const wishes = this.data.wishes;
      wishes.unshift({ 
          id: Date.now(),
          text: this.data.newWish, 
          date: new Date().toLocaleDateString() 
      });
      this.setData({ wishes, newWish: '' });
      wx.setStorageSync('wishes', wishes);
      wx.showToast({ title: '许愿成功！', icon: 'success' });
  }
});

