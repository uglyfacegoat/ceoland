/* One canonical text for the consent page, saved revision and server evidence. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CEO_LEGAL_TOOLS=api;})(globalThis,()=>{
  function sections(doc,purpose){
    if(!doc.contexts)return doc.sections;
    if(!Object.hasOwn(doc.contexts,purpose||''))return [{title:'01 / Выберите форму',paragraphs:['Согласие оформляется отдельно для цели выбранной формы. Откройте соответствующий вариант, чтобы прочитать конкретную цель и перечень данных.'],links:Object.entries(doc.contexts).map(([key,value])=>({label:value.label,screen:'data-consent',extra:{purpose:key}}))}];
    const context=doc.contexts[purpose];
    return doc.sections.map(section=>({...section,paragraphs:section.paragraphs.map(text=>text.replace(/\{\{(purpose|data)\}\}/g,(_,key)=>context[key]))}));
  }
  function snapshot(legal,screen,doc,purpose){
    const context=doc.contexts&&Object.hasOwn(doc.contexts,purpose||'')?doc.contexts[purpose]:null;
    const name=screen+(context?'-'+purpose:'');
    const text=[doc.label,'CEOMENTALITY','Редакция: '+legal.revision,legal.draft?'РАБОЧАЯ РЕДАКЦИЯ — требует утверждения оператором':'',context?.label||'',doc.description,...sections(doc,purpose).flatMap(section=>[section.title,...section.paragraphs,...(section.links||[]).map(link=>link.label)]),...(doc.pending.length?['ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ',...doc.pending]:[])].filter(Boolean).join('\n\n')+'\n';
    return {name,text,path:'legal/'+legal.revision+'/'+name};
  }
  return {sections,snapshot};
});
