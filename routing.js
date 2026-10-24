(function(root,factory){
  const routing=factory();
  if(typeof module==='object'&&module.exports)module.exports=routing;
  else root.CEO_ROUTES=routing;
})(typeof window==='object'?window:globalThis,()=>{
  const names='objects wallet wallet-white nfc next-item access code-error cart cart-empty checkout checkout-validation payment processing payment-failed thank-you order join application application-received membership-confirmed purchase-application purchase-received faq loading contact menu contact-received privacy agreement purchase-terms company data-consent cookies screens'.split(' ');
  const valid=name=>names.includes(name);
  const route=(name,extra={})=>{
    if(!valid(name))throw new Error('Unknown page');
    const query=new URLSearchParams(extra);query.delete('screen');
    return '/'+name+(query.size?'?'+query:'');
  };
  const screen=url=>{
    const path=url.pathname.slice(1);
    return valid(path)?path:valid(url.searchParams.get('screen'))?url.searchParams.get('screen'):'objects';
  };
  const redirect=url=>{
    if(url.pathname==='/index.html')return '/'+url.search+url.hash;
    if(url.pathname==='/app.html')return route(screen(url),url.searchParams)+url.hash;
    return null;
  };
  return {names,valid,route,screen,redirect};
});
