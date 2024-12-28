import { TextareaPlugin } from './plugin.js';

export const id = 'textarea';
export const css = `
.tp-txtrv{
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-color: rgba(0,0,0,0);
  border-width: 0;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  margin: 0;
  outline: none;
  padding: 0
}

.tp-txtrv {
  background-color: var(--in-bg);
  border-radius: var(--bld-br);
  box-sizing: border-box;
  color: var(--in-fg);
  font-family: inherit;
  height: var(--cnt-usz);
  line-height: var(--cnt-usz);
  min-width: 0;
  width: 100%;
}

.tp-txtrv:hover {
  background-color: var(--in-bg-h);
}
.tp-txtrv:focus {
  background-color: var(--in-bg-f);
}
.tp-txtrv:active{
  background-color: var(--in-bg-a);
}
.tp-txtrv:disabled{
  opacity: .5;
}
.tp-txtrv {
  display: block;
  height: auto;
  padding-bottom: 0;
  overflow: hidden;
  position: relative
}
.tp-txtrv.tp-v-disabled{
  opacity: .5;
}
.tp-txtrv .tp-txtrv_i{
  font-family: var(--font-family);
  background-color: var(--in-bg);
  border-radius: var(--bld-br);
  box-sizing: border-box;
  color: var(--in-fg);
  font-size: 11px;
  padding: 4px;
  line-height: 16px;
  min-width: 0;
  width: 100%;
  border: none;
  height: 100%;
  resize: none;
  margin-bottom: -8px
}
.tp-txtrv .tp-txtrv_i:focus{
  outline: none
}`

export const plugins = [ TextareaPlugin ];
