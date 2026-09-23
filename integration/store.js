/* Store only non-secret UI state; never persist contacts, access codes or QR tokens. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CEO_STORE=api;})(globalThis,()=>{
  function read(storage,key,fallback){try{return JSON.parse(storage.getItem(key))??fallback;}catch{return fallback;}}
  function write(storage,key,value){try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
  function cart(value){
    if(!Array.isArray(value))return [];
    return ['white','black'].flatMap(colour=>{
      const quantity=value.filter(x=>x?.colour===colour&&Number.isInteger(x.quantity)&&x.quantity>0).reduce((n,x)=>n+Math.min(x.quantity,10),0);
      return quantity?[{colour,quantity:Math.min(10,quantity)}]:[];
    });
  }
  const items = value => cart(value).map(x=>({variantId:'ceowallet-'+x.colour,quantity:x.quantity}));
  const phone = value => {const raw=String(value).trim();const digits=raw.replace(/\D/g,'');return digits.length===10?'+7'+digits:digits.length===11&&/^[78]/.test(digits)?'+7'+digits.slice(1):'+'+digits;};
  return {read,write,cart,items,phone};
});
