'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, CreditCard, LockKeyhole, Smartphone } from 'lucide-react';

declare global { interface Window { paypal?: any; google?: any; ApplePaySession?: any } }
type Checkout = { amount:string; currency:string; clientId:string; browserToken:string|null; billId:string; paid:boolean; status:string };
function base(ticket:string) { return `/api/payments/paypal/session/${encodeURIComponent(ticket)}`; }
async function post(url:string,body?:object) {
  const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(body ?? {})});
  const json=await res.json().catch(()=>({}));
  if (!res.ok || json.error) throw new Error(json.errorMessage || 'Payment could not be completed.');
  return json.data;
}
const fmt=(num:string)=>`₱${Number(num).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const getAppLink=(billId:string)=>`autocare://payment-success?billId=${encodeURIComponent(billId)}`;

export default function PaypalCheckoutClient({ticket,returnTo}:{ticket:string;returnTo?:string}) {
  const [info,setInfo]=useState<Checkout|null>(null);
  const [error,setError]=useState('');
  const [phase,setPhase]=useState<'loading'|'ready'|'paying'|'paid'|'error'>('loading');
  const [eligible,setEligible]=useState({wallet:false,card:false,google:false,apple:false});
  
  const paypalContainer=useRef<HTMLDivElement|null>(null);
  const googleContainer=useRef<HTMLDivElement|null>(null);
  const appleContainer=useRef<HTMLDivElement|null>(null);
  const sdkLoaded=useRef(false);
  const initialized=useRef(false);
  const completeRef=useRef(false);

  const finish=useCallback((billId:string)=>{completeRef.current=true;setPhase('paid');
    // Only server-confirmed captured PayPal orders can reach here.
    // Browser auto deep-link is not guaranteed on all devices; show explicit button.
    if (!returnTo && /Android|iPhone|iPad/i.test(navigator.userAgent)) setTimeout(()=>{window.location.href=getAppLink(billId);},900);
  },[returnTo]);
  useEffect(()=>{let live=true;
    fetch(base(ticket),{cache:'no-store',credentials:'same-origin'})
      .then(async r=>{const j=await r.json();if(!r.ok||j.error)throw new Error(j.errorMessage||'Checkout is unavailable.');return j.data as Checkout;})
      .then(data=>{if(!live)return;setInfo(data);setPhase(data.paid?'paid':'ready');if(data.paid)completeRef.current=true;})
      .catch(e=>{if(live){setError(e.message||'Unable to open checkout');setPhase('error');}});
    return()=>{live=false;};
  },[ticket]);

  const capture=useCallback(async(orderId:string)=>{
    setPhase('paying');
    try {const result=await post(`${base(ticket)}/capture`,{orderId});
      if(result.paid!==true) throw new Error('PayPal payment is awaiting server confirmation.');
      if(info?.billId) finish(info.billId);
    } catch(e:any) {setError(e?.message||'Payment confirmation failed.');setPhase('ready');throw e;}
  },[ticket,info?.billId,finish]);

  const createOrder=useCallback(async()=>{
    const d=await post(`${base(ticket)}/order`); if(!d.id)throw new Error('Missing PayPal order reference.');return d.id as string;
  },[ticket]);

  // Load official SDK from PayPal, not from npm or a rehosted bundle.
  useEffect(()=>{
    if(!info || info.paid || initialized.current)return;
    initialized.current=true;
    const script=document.createElement('script');
    script.src='https://www.sandbox.paypal.com/web-sdk/v6/core';script.async=true;
    script.onload=()=>{sdkLoaded.current=true;void initialize();};
    script.onerror=()=>{setError('Could not load PayPal checkout. Check your network connection.');setPhase('error');};
    document.head.appendChild(script);
    let active=true;
    async function initialize(){
      if(!active || !window.paypal || !info)return;
      try {
        const sdk=await window.paypal.createInstance({clientId:info.clientId,
          components:['paypal-payments'],pageType:'checkout'});
        const methods=await sdk.findEligibleMethods({currencyCode:'PHP',amount:info.amount});
        if(!active)return;
        const wallet=Boolean(methods.isEligible('paypal'));
        const google=Boolean(methods.isEligible('googlepay'));
        const apple=Boolean(methods.isEligible('applepay'));
        setEligible(old=>({...old,wallet,google,apple}));
        if(wallet && paypalContainer.current){
          const button=document.createElement('paypal-button');paypalContainer.current.appendChild(button);
          const session=sdk.createPayPalOneTimePaymentSession({
            onApprove:async(data:any)=>{await capture(data.orderId);},
            onCancel:()=>{setError('Payment cancelled. No payment was collected.');setPhase('ready');},
            onError:(e:any)=>{setError(e?.message||'PayPal checkout was interrupted.');setPhase('ready');},
          });
          button.addEventListener('click',()=>{
            setError('');const orderPromise=createOrder().then(orderId=>({orderId}));
            void session.start({presentationMode:'auto'},orderPromise).catch((e:any)=>{
              setError(e?.message||'Unable to start PayPal checkout.');setPhase('ready');
            });
          });
        }
        // Apple Pay and Google Pay must not be rendered unless PayPal reports
        // eligibility. Most Philippine sandbox buyers will not be eligible.
        try {
        let walletSdk:any=null;
        if (google || apple) {
          try { walletSdk=await window.paypal.createInstance({clientId:info.clientId,components:['googlepay-payments','applepay-payments'],pageType:'checkout'}); }
          catch(e){ console.warn('Optional digital wallets are not enabled by PayPal:',e); }
        }
        if(google && walletSdk){
          if (!window.google?.payments?.api) {
            await new Promise<void>((resolve,reject)=>{
              const gs=document.createElement('script');gs.src='https://pay.google.com/gp/p/js/pay.js';gs.async=true;
              gs.onload=()=>resolve();gs.onerror=()=>reject(new Error('Google Pay SDK could not load.'));
              document.head.appendChild(gs);
            });
          }
        }
        if(google && walletSdk && window.google?.payments?.api && googleContainer.current){
          const session=walletSdk.createGooglePayOneTimePaymentSession();
          const configuration=session.formatConfigForPaymentRequest(methods.getDetails('googlepay').config);
          const client=new window.google.payments.api.PaymentsClient({environment:'TEST',paymentDataCallbacks:{
            onPaymentAuthorized:async(paymentData:any)=>{
              try{const orderId=await createOrder();const result=await session.confirmOrder({orderId,paymentMethodData:paymentData.paymentMethodData});
                if(result.status!=='APPROVED')throw new Error('Google Pay requires additional payer approval.');
                await capture(orderId);return {transactionState:'SUCCESS'};
              }catch(e:any){setError(e?.message||'Google Pay authorization failed.');return {transactionState:'ERROR',error:{message:e?.message||'Payment failed'}};}
            },
          }});
          const readiness=await client.isReadyToPay({allowedPaymentMethods:configuration.allowedPaymentMethods,
            apiVersion:configuration.apiVersion,apiVersionMinor:configuration.apiVersionMinor});
          if(readiness.result){
            const button=client.createButton({onClick:()=>{void client.loadPaymentData({...configuration,
              transactionInfo:{countryCode:configuration.countryCode,currencyCode:'PHP',totalPriceStatus:'FINAL',totalPrice:info.amount},
              callbackIntents:['PAYMENT_AUTHORIZATION']}).catch((e:any)=>setError(e?.message||'Google Pay unavailable.'));}});
            googleContainer.current.appendChild(button);
          }
        }
        if(apple && walletSdk && window.ApplePaySession && appleContainer.current && window.ApplePaySession.canMakePayments()){
          const session=await walletSdk.createApplePayOneTimePaymentSession();const config=await session.config();
          const button=document.createElement('apple-pay-button');button.setAttribute('buttonstyle','black');
          button.setAttribute('type','buy');button.setAttribute('locale','en');appleContainer.current.appendChild(button);
          button.addEventListener('click',()=>{
            const appleSession=new window.ApplePaySession(4,{countryCode:'PH',currencyCode:'PHP',
              merchantCapabilities:config.merchantCapabilities,supportedNetworks:config.supportedNetworks,
              requiredBillingContactFields:['name','postalAddress'],total:{label:'AutoCare Final Cost',amount:info.amount,type:'final'}});
            appleSession.onvalidatemerchant=async(e:any)=>{try{const data=await session.validateMerchant({validationUrl:e.validationURL});
              appleSession.completeMerchantValidation(data.merchantSession);}catch{appleSession.abort();}};
            appleSession.onpaymentauthorized=async(e:any)=>{try{const orderId=await createOrder();
              const result=await session.confirmOrder({orderId,token:e.payment.token,billingContact:e.payment.billingContact});
              if(result.status!=='APPROVED')throw new Error('Additional authorization required.');
              await capture(orderId);appleSession.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            }catch(err:any){setError(err?.message||'Apple Pay unavailable.');appleSession.completePayment(window.ApplePaySession.STATUS_FAILURE);}};
            appleSession.begin();
          });
        }
        } catch (walletError) { console.warn('Optional Apple/Google Pay unavailable:', walletError); }
        // A separate SDK instance is used for direct card fields, which require
        // client-token eligibility; card details are hosted by PayPal in iframes.
        try {
          if (!info.browserToken) throw new Error('Card fields are not activated for this PayPal sandbox app.');
          const cardSdk=await window.paypal.createInstance({clientToken:info.browserToken,components:['card-fields'],pageType:'checkout'});
          const cardMethods=await cardSdk.findEligibleMethods({currencyCode:'PHP',amount:info.amount});
          if(active && cardMethods.isEligible('advanced_cards')){
            const cardSession=cardSdk.createCardFieldsOneTimePaymentSession();
            const types=['number','expiry','cvv'];
            for(const type of types){const parent=document.getElementById(`paypal-card-${type}`);
              if(parent) parent.appendChild(cardSession.createCardFieldsComponent({type,placeholder:type==='number'?'Card number':type==='expiry'?'MM / YY':'CVV'}));}
            setEligible(old=>({...old,card:true}));
            const pay=document.getElementById('paypal-card-submit');
            pay?.addEventListener('click',()=>{void (async()=>{setError('');setPhase('paying');
              try{const orderId=await createOrder();const {data,state}=await cardSession.submit(orderId,{});
                if(state==='succeeded'){await capture(data?.orderId||orderId);}else{throw new Error(state==='canceled'?'Card authentication cancelled.':data?.message||'Card authorization failed.');}
              }catch(err:any){setError(err?.message||'Unable to process card.');setPhase('ready');}})();});
          }
        } catch(e){console.warn('PayPal hosted card fields unavailable:',e);}
      }catch(e:any){setError(e?.message||'PayPal checkout could not initialize.');setPhase('error');}
    }
    return()=>{active=false;script.remove();};
  },[info,createOrder,capture]);

  const price=useMemo(()=>info?fmt(info.amount):'',[info]);
  const paid=phase==='paid';
  return <div className="mx-auto max-w-[780px] px-4 py-12 sm:px-6">
    <div className="rounded-3xl border border-[#e4e5e8] bg-white p-6 shadow-xl shadow-black/5 sm:p-10">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#191b1f]">
        <span className="rounded-xl bg-[#C1272D] px-3 py-2 text-white">A</span> AutoCare
      </div><span className="inline-flex items-center gap-1 rounded-full bg-[#e6f5ec] px-3 py-1 text-xs font-bold text-[#197243]"><LockKeyhole size={13}/> PayPal secure checkout</span></div>
      <p className="mt-8 text-xs font-bold uppercase tracking-[.15em] text-gray-500">Final Cost</p>
      <p className="mt-1 text-4xl font-extrabold text-[#161719]">{price||'—'}</p>
      <p className="mt-2 text-sm text-gray-500">PayPal sandbox · Academic demonstration · No real funds collected</p>
      {paid ? <div className="mt-8 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto text-emerald-700" size={46}/><h1 className="text-xl font-bold text-emerald-900">Payment confirmed</h1>
        <p className="text-sm text-emerald-800">Your Final Cost and demonstration receipt are ready in AutoCare.</p>
        <a href={returnTo||getAppLink(info?.billId||'')} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#C1272D] px-6 font-bold text-white">{returnTo?'View Final Cost and receipt':'Open AutoCare'}</a>
      </div> : <>
        <h1 className="mt-8 text-lg font-bold">Choose a payment method</h1>
        <p className="mt-1 text-sm text-gray-500">PayPal shows methods supported by your sandbox account and device.</p>
        <div className="mt-6 space-y-5">
          <section className="rounded-2xl border border-[#e5e6ea] p-5"><h2 className="mb-3 font-semibold">PayPal Wallet</h2>
            <div ref={paypalContainer}/>{phase!=='loading' && !eligible.wallet && <p className="text-sm text-gray-500">PayPal Wallet is not currently available for this checkout or buyer.</p>}
          </section>
          <section className="rounded-2xl border border-[#e5e6ea] p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><CreditCard size={19}/> Credit / Debit Card</h2>
            <p className="mb-3 text-xs text-gray-500">Card details are handled by PayPal, not stored by AutoCare.</p>
            <div className={eligible.card?'':'hidden'}><div id="paypal-card-number" className="mb-3 h-12 rounded-md border border-gray-200 p-2"/>
            <div id="paypal-card-expiry" className="mb-3 h-12 rounded-md border border-gray-200 p-2"/>
            <div id="paypal-card-cvv" className="mb-3 h-12 rounded-md border border-gray-200 p-2"/>
            <button id="paypal-card-submit" disabled={phase==='paying'} className="min-h-12 w-full rounded-xl bg-[#C1272D] font-semibold text-white disabled:opacity-50">Pay with Card</button></div>
            {!eligible.card && <p className="text-sm text-gray-500">Direct card checkout is available only when enabled by PayPal for this account. You may also use a linked card through PayPal Wallet.</p>}
          </section>
          <section className={`${eligible.google?'':'hidden'} rounded-2xl border border-[#e5e6ea] p-5`}><h2 className="mb-3 flex items-center gap-2 font-semibold"><Smartphone size={19}/> Google Pay</h2><div ref={googleContainer}/></section>
          <section className={`${eligible.apple?'':'hidden'} rounded-2xl border border-[#e5e6ea] p-5`}><h2 className="mb-3 font-semibold">Apple Pay</h2><div ref={appleContainer}/></section>
        </div>
        {phase==='paying' && <p className="mt-5 font-medium text-[#C1272D]">Verifying payment with PayPal…</p>}
        {!!error && <div role="alert" className="mt-6 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} className="shrink-0"/>{error}</div>}
      </>}
    </div>
  </div>;
}
