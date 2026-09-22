const answers = [
  ['НЕТ.', 'Нет. Продукция — физические объекты CEOMENTALITY. Членство проходит через отдельный ручной отбор. Покупка не гарантирует вступление.'],
  ['ЧЕРЕЗ ОТБОР.', 'После получения картхолдера заполните анкету по QR внутри. Команда изучает каждую заявку вручную. После одобрения вы получите приглашение в клуб.'],
  ['ДОСТУП.', 'Продукция CEOMENTALITY доступна по коду. Код открывает доступ к покупке объектов. Решение о членстве в клубе принимается отдельно.'],
  ['УТОЧНИТЕ.', 'Возможность повторного использования кода необходимо уточнить у команды CEOMENTALITY перед следующей покупкой.'],
  ['ПРОВЕРЬТЕ.', 'Проверьте статус платежа и сохраните подтверждение. Если оплата прошла, а подтверждение не пришло, обратитесь к команде CEOMENTALITY.'],
  ['ПРОДОЛЖЕНИЕ.', 'NFC CARD — металлическая NFC-визитка — в разработке. В клубе предусмотрены общение, закрытые встречи и привилегии в местах партнёров.']
];
const tabs = [...document.querySelectorAll('[data-question]')];
const answer = document.querySelector('#answer');
function selectQuestion(index) {
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
  answer.setAttribute('aria-labelledby',`question-${index}`);
  answer.querySelector('.answer-number').textContent=`ОТВЕТ / ${String(index+1).padStart(2,'0')}`;
  answer.querySelector('h3').textContent=answers[index][0];
  answer.querySelector('.answer-body').textContent=answers[index][1];
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectQuestion(index));
  tab.addEventListener('keydown',event=>{
    const next=event.key==='ArrowDown'?(index+1)%tabs.length:event.key==='ArrowUp'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
    if(next!==null){event.preventDefault();selectQuestion(next);tabs[next].focus();}
  });
});
document.querySelectorAll('[data-faq-link]').forEach(link=>link.addEventListener('click',()=>selectQuestion(Number(link.dataset.faqLink))));
const wallet=document.querySelector('#wallet-image');
document.querySelectorAll('input[name="colour"]').forEach(input=>input.addEventListener('change',()=>{
  const white=input.value==='white';
  wallet.src=white?'assets/wallet-white-front.png':'assets/imgOriginalCeowalletBlack.png';
  wallet.alt=`${white?'Белый':'Чёрный'} кожаный картхолдер CEOWALLET`;
  document.querySelectorAll('[data-wallet-link]').forEach(link=>link.href=`app.html?screen=${white?'wallet-white':'wallet'}`);
}));
