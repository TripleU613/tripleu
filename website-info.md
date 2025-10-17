# TripleU Bio Website Information

## Personal Info
- **Name:** TripleU
- **Bio:** Software Engineer and Kosher software enthusiast

## Contact Information
- **WhatsApp:** +18483336818
- **Email:** tripleuworld@gmail.com
- **Text:** 7325038790

## Social & Forum Links
- **Jtech Forums:** https://forums.jtechforums.org
- **Mitmachim Top:** https://mitmachim.top/user/tripleu
- **GitHub:** https://github.com/TripleU613
- **Discord:** @tripleu613

## Payment/Donation Links
- **Ko-fi:** https://ko-fi.com/tripleu
- **PayPal:** https://paypal.me/UsherWeiss
- **Stripe Donation Link:** https://buy.stripe.com/5kA7sM2lh3LB45J0l78og03

## Payment Integration Codes

### Ko-fi Widget (Floating Chat)
```html
<script src='https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'></script>
<script>
  kofiWidgetOverlay.draw('tripleu', {
    'type': 'floating-chat',
    'floating-chat.donateButton.text': 'Donate',
    'floating-chat.donateButton.background-color': '#323842',
    'floating-chat.donateButton.text-color': '#fff'
  });
</script>
```

### Ko-fi Panel (Alternative)
```html
<iframe id='kofiframe' src='https://ko-fi.com/tripleu/?hidefeed=true&widget=true&embed=true&preview=true' style='border:none;width:100%;padding:4px;background:#f9f9f9;' height='712' title='tripleu'></iframe>
```

### Stripe Buy Button
```html
<script async
  src="https://js.stripe.com/v3/buy-button.js">
</script>

<stripe-buy-button
  buy-button-id="buy_btn_1SIvK2Jwcr7fenMyjb3YPDHV"
  publishable-key="pk_live_51ReTvQJwcr7fenMyrmPriiaOZKFBW0NHUQGln7of5vt7Fu6cBsiB8wiLI1mXre3DVTcUz8YAJEjKWKB73ZfgopnR00GtQRdtHF"
>
</stripe-buy-button>
```

### PayPal Button
```html
<script
  src="https://www.paypal.com/sdk/js?client-id=BAA3cm5zw6EzO1l6EnEN1iG_xW58Z9COKv8vFOaCLes16kvplu0i8V1bRY5yOsmAC5JqoxtGkzV44-QL-s&components=hosted-buttons&disable-funding=venmo&currency=USD"
  crossorigin="anonymous"
  async>
</script>

<script>
  document.addEventListener("DOMContentLoaded", (event) => {
    paypal.HostedButtons({
      hostedButtonId: "8PQ3E8WPJ4D7A"
    })
    .render("#paypal-container-8PQ3E8WPJ4D7A")
  })
</script>

<div id="paypal-container-8PQ3E8WPJ4D7A"></div>
```

### GitHub Sponsor Button
```html
<iframe src="https://github.com/sponsors/TripleU613/button" title="Sponsor TripleU613" height="32" width="114" style="border: 0; border-radius: 6px;"></iframe>
```

### GitHub Sponsor Card
```html
<iframe src="https://github.com/sponsors/TripleU613/card" title="Sponsor TripleU613" height="225" width="600" style="border: 0;"></iframe>
```

## Design Requirements
- Dark mode theme
- Blue accent colors with blue glow effects
- Beautiful animations and graphics
- Interactive elements
- Professional and modern layout