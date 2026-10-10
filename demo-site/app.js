const cart = [
  { product: "Wireless Headphones", price: 59 }
];

function updateCartUI() {
  const cartIndicator = document.querySelector('.cart-indicator');
  if (cartIndicator) cartIndicator.textContent = `Cart (${cart.length})`;

  const cartList = document.getElementById('cart-list');
  const cartTotal = document.querySelector('.cart-total');
  
  if (cartList && cartTotal) {
    cartList.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `1 x ${item.product} - $${item.price}`;
      cartList.appendChild(li);
      total += item.price;
    });
    cartTotal.textContent = `Total: $${total}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addButtons = document.querySelectorAll('button[data-product]');
  addButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const product = e.target.getAttribute('data-product');
      const price = parseInt(e.target.getAttribute('data-price'), 10);
      cart.push({ product, price });
      updateCartUI();
    });
  });

  const checkoutBtn = document.querySelector('.btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }
});
