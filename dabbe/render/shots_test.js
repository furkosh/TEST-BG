'use strict';
const E = window.TL.events;
let SHOTS = [
 { a: 0, b: 1, f: (ctx, t) => { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, W, H); drawManBust(ctx, 540, 1000, 1.2, { t, light: 'flash', open: 1, wide: 1, pupil: 0.6 }); } },
 { a: 1, b: 2, f: (ctx, t) => { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, W, H); drawManBust(ctx, 540, 1000, 1.2, { t, light: 'lantern', open: 1, wide: 1, pupil: 0.6 }); } },
 { a: 2, b: 3, f: (ctx, t) => { ctx.fillStyle = '#333'; ctx.fillRect(0, 0, W, H); drawManBust(ctx, 540, 1000, 1.2, { t, light: 'flash', open: 1, wide: 1, pupil: 0.6, sweat: 0.7 }); } },
];
