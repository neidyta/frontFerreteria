/* app.js - SPA frontend para inventario de ferretería
   Persistencia simple en localStorage para productos, proveedores y ventas.
*/

(() => {
  //manejar vistas (mostrar/ocultar)
  const views = {
    login: document.getElementById('view-login'),
    dashboard: document.getElementById('view-dashboard'),
    inventario: document.getElementById('view-inventario'),
    'product-form': document.getElementById('view-product-form'),
    proveedores: document.getElementById('view-proveedores'),
    'provider-form': document.getElementById('view-provider-form'),
    ventas: document.getElementById('view-ventas')
  };

  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    const v = views[name];
    if (v) v.classList.add('active');
    currentView = name;
    renderAll();
  }

  // Back buttons (data-target)
  document.querySelectorAll('.btn.back').forEach(b=>{
    b.addEventListener('click', ()=> {
      const t = b.dataset.target;
      if (t) showView(t);
    });
  });

  //Modal confirm (simple)
  const modal = document.getElementById('modal');
  const modalText = document.getElementById('modal-text');
  const modalOk = document.getElementById('modal-ok');
  const modalCancel = document.getElementById('modal-cancel');
  function confirmDialog(message){ // retorna promesa
    modalText.textContent = message;
    modal.classList.remove('hidden');
    return new Promise((res) => {
      const ok = ()=>{ cleanup(); res(true); };
      const cancel = ()=>{ cleanup(); res(false); };
      function cleanup(){
        modal.classList.add('hidden');
        modalOk.removeEventListener('click', ok);
        modalCancel.removeEventListener('click', cancel);
      }
      modalOk.addEventListener('click', ok);
      modalCancel.addEventListener('click', cancel);
    });
  }

  //Storage helpers
  const STORAGE_KEYS = {
    PRODUCTS: 'ferre_products_v1',
    PROVIDERS: 'ferre_providers_v1',
    SALES: 'ferre_sales_v1'
  };
  function load(key){ const raw = localStorage.getItem(key); return raw? JSON.parse(raw): []; }
  function save(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  //Model accessors
  function getProducts(){ return load(STORAGE_KEYS.PRODUCTS); }
  function setProducts(p){ save(STORAGE_KEYS.PRODUCTS, p); }
  function getProviders(){ return load(STORAGE_KEYS.PROVIDERS); }
  function setProviders(p){ save(STORAGE_KEYS.PROVIDERS, p); }
  function getSales(){ return load(STORAGE_KEYS.SALES); }
  function setSales(s){ save(STORAGE_KEYS.SALES, s); }

  //Current state
  let currentView = 'login';
  let editingProductId = null;
  let editingProviderId = null;

  //Login
  document.getElementById('btn-login').addEventListener('click', ()=>{
    //aceptar cualquier usuario
    const u = document.getElementById('login-usuario').value.trim();
    if(!u){ alert('Ingrese usuario'); return; }
    showView('dashboard');
  });

  document.getElementById('btn-logout').addEventListener('click', async ()=>{
    const ok = await confirmDialog('¿Desea cerrar sesión?');
    if(ok) {
      showView('login');
    }
  });

  //Navegación desde dashboard
  document.getElementById('menu-inventario').addEventListener('click', ()=>showView('inventario'));
  document.getElementById('menu-proveedores').addEventListener('click', ()=>showView('proveedores'));
  document.getElementById('menu-ventas').addEventListener('click', ()=>showView('ventas'));

  //Productos: renderizar tabla
  const tableProductsBody = document.querySelector('#table-products tbody');
  function renderProducts(){
    const products = getProducts();
    tableProductsBody.innerHTML = '';
    products.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.codigo}</td>
        <td>${p.nombre}</td>
        <td>${p.precio.toFixed(2)}</td>
        <td>${p.cantidad}</td>
        <td>
          <button class="action-btn action-edit" data-i="${idx}">✏️</button>
          <button class="action-btn action-delete" data-i="${idx}">Eliminar</button>
        </td>
      `;
      tableProductsBody.appendChild(tr);
    });

    // attach events
    tableProductsBody.querySelectorAll('.action-edit').forEach(b=>{
      b.addEventListener('click', e=>{
        const i = +b.dataset.i;
        startEditProduct(i);
      });
    });
    tableProductsBody.querySelectorAll('.action-delete').forEach(b=>{
      b.addEventListener('click', async e=>{
        const i = +b.dataset.i;
        const ok = await confirmDialog('¿Eliminar este producto?');
        if(!ok) return;
        const arr = getProducts();
        arr.splice(i,1);
        setProducts(arr);
        renderProducts();
      });
    });
  }

  //Producto (nuevo / editar)
  const pCodigo = document.getElementById('p-codigo');
  const pNombre = document.getElementById('p-nombre');
  const pPrecio = document.getElementById('p-precio');
  const pCantidad = document.getElementById('p-cantidad');
  const pStockMin = document.getElementById('p-stock-min');
  const productFormTitle = document.getElementById('product-form-title');

  document.getElementById('btn-new-product').addEventListener('click', ()=>{
    editingProductId = null;
    productFormTitle.textContent = 'Nuevo producto';
    pCodigo.value = '';
    pNombre.value = '';
    pPrecio.value = '';
    pCantidad.value = '';
    pStockMin.value = '';
    showView('product-form');
  });

  document.getElementById('btn-clear-product').addEventListener('click', ()=>{
    pCodigo.value = '';
    pNombre.value = '';
    pPrecio.value = '';
    pCantidad.value = '';
    pStockMin.value = '';
  });

  document.getElementById('btn-save-product').addEventListener('click', ()=>{
    const codigo = pCodigo.value.trim();
    const nombre = pNombre.value.trim();
    const precio = parseFloat(pPrecio.value) || 0;
    const cantidad = parseInt(pCantidad.value) || 0;
    const stockMin = parseInt(pStockMin.value) || 0;
    if(!codigo || !nombre){ alert('Código y nombre obligatorios'); return; }

    const products = getProducts();

    if(editingProductId === null){
      // comprobar código único
      if(products.some(pr=>pr.codigo === codigo)){ alert('Código ya existe.'); return; }
      products.push({codigo, nombre, precio, cantidad, stockMin});
    } else {
      // editar
      products[editingProductId] = {codigo, nombre, precio, cantidad, stockMin};
    }
    setProducts(products);
    showView('inventario');
  });

  function startEditProduct(index){
    const products = getProducts();
    const p = products[index];
    if(!p) return;
    editingProductId = index;
    productFormTitle.textContent = 'Editar producto';
    pCodigo.value = p.codigo;
    pNombre.value = p.nombre;
    pPrecio.value = p.precio;
    pCantidad.value = p.cantidad;
    pStockMin.value = p.stockMin;
    showView('product-form');
  }

  // --- Proveedores: render ---
  const tableProvidersBody = document.querySelector('#table-providers tbody');

  function renderProviders(){
    const arr = getProviders();
    tableProvidersBody.innerHTML = '';
    arr.forEach((pr, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${pr.nombre}</td>
        <td>${pr.telefono}</td>
        <td>${pr.correo}</td>
        <td>${pr.producto}</td>
        <td>
          <button class="action-btn action-edit" data-i="${idx}">✏️</button>
          <button class="action-btn action-delete" data-i="${idx}">Eliminar</button>
        </td>
      `;
      tableProvidersBody.appendChild(tr);
    });

    tableProvidersBody.querySelectorAll('.action-edit').forEach(b=>{
      b.addEventListener('click', e=>{
        startEditProvider(+b.dataset.i);
      });
    });
    tableProvidersBody.querySelectorAll('.action-delete').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const i = +b.dataset.i;
        const ok = await confirmDialog('¿Eliminar proveedor?');
        if(!ok) return;
        const arr = getProviders();
        arr.splice(i,1);
        setProviders(arr);
        renderProviders();
      });
    });
  }

  // provider form
  const prNombre = document.getElementById('pr-nombre');
  const prTelefono = document.getElementById('pr-telefono');
  const prCorreo = document.getElementById('pr-correo');
  const prProducto = document.getElementById('pr-producto');
  const providerFormTitle = document.getElementById('provider-form-title');

  document.getElementById('btn-new-provider').addEventListener('click', ()=>{
    editingProviderId = null;
    providerFormTitle.textContent = 'Nuevo proveedor';
    prNombre.value = ''; prTelefono.value = ''; prCorreo.value = ''; prProducto.value = '';
    showView('provider-form');
  });

  document.getElementById('btn-clear-provider').addEventListener('click', ()=>{
    prNombre.value = ''; prTelefono.value = ''; prCorreo.value = ''; prProducto.value = '';
  });

  document.getElementById('btn-save-provider').addEventListener('click', ()=>{
    const nombre = prNombre.value.trim();
    const telefono = prTelefono.value.trim();
    const correo = prCorreo.value.trim();
    const producto = prProducto.value.trim();
    if(!nombre){ alert('Nombre obligatorio'); return; }

    const arr = getProviders();
    if(editingProviderId === null){
      arr.push({nombre, telefono, correo, producto});
    } else {
      arr[editingProviderId] = {nombre, telefono, correo, producto};
    }
    setProviders(arr);
    showView('proveedores');
  });

  function startEditProvider(i){
    const arr = getProviders(); const pr = arr[i];
    if(!pr) return;
    editingProviderId = i;
    providerFormTitle.textContent = 'Editar proveedor';
    prNombre.value = pr.nombre;
    prTelefono.value = pr.telefono;
    prCorreo.value = pr.correo;
    prProducto.value = pr.producto;
    showView('provider-form');
  }

  //Ventas: registrar y mostrar
  const vCodigo = document.getElementById('v-codigo');
  const vCantidad = document.getElementById('v-cantidad');
  const tableSalesBody = document.querySelector('#table-sales tbody');

  document.getElementById('btn-add-sale').addEventListener('click', ()=>{
    const codigo = vCodigo.value.trim();
    const cantidad = parseInt(vCantidad.value) || 0;
    if(!codigo || cantidad <= 0){ alert('Código y cantidad válidos'); return; }
    const products = getProducts();
    const prod = products.find(p => p.codigo === codigo);
    if(!prod){ alert('Producto no encontrado'); return; }
    if(prod.cantidad < cantidad){ alert('Stock insuficiente'); return; }

    // restar stock
    prod.cantidad -= cantidad;
    setProducts(products);

    // crear venta
    const sale = {
      fecha: new Date().toISOString(),
      codigo: prod.codigo,
      nombre: prod.nombre,
      cantidad,
      total: (prod.precio * cantidad)
    };
    const ventas = getSales();
    ventas.unshift(sale);
    setSales(ventas);
    vCodigo.value = '';
    vCantidad.value = 1;
    renderSales();
    renderProducts();
  });

  function renderSales(){
    const arr = getSales();
    tableSalesBody.innerHTML = '';
    arr.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${(new Date(s.fecha)).toLocaleString()}</td>
        <td>${s.codigo}</td>
        <td>${s.nombre}</td>
        <td>${s.cantidad}</td>
        <td>${s.total.toFixed(2)}</td>
      `;
      tableSalesBody.appendChild(tr);
    });
  }

  //Render everything useful al cambiar vistas o actualizar datos
  function renderAll(){
    renderProducts();
    renderProviders();
    renderSales();
  }

  //Inicialización: cargar datos de ejemplo si vacío
  function seedIfEmpty(){
    if(getProducts().length === 0){
      const sample = [
        {codigo:'P001', nombre:'Tornillo 3/8', precio:0.5, cantidad:120, stockMin:10},
        {codigo:'P002', nombre:'Taladro', precio:45.0, cantidad:12, stockMin:2},
        {codigo:'P003', nombre:'Cemento 50kg', precio:7.5, cantidad:40, stockMin:5}
      ];
      setProducts(sample);
    }
    if(getProviders().length === 0){
      setProviders([
        {nombre:'Ferremayor', telefono:'312111222', correo:'ventas@ferremayor.com', producto:'Cemento'},
        {nombre:'Herracor', telefono:'321555444', correo:'info@herracor.com', producto:'Herramientas'}
      ]);
    }
  }

  seedIfEmpty();
  showView('login'); 
})();
