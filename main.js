// A.S Matawalle Computer Business Centre - Main JS

document.addEventListener('DOMContentLoaded', function () {
  // Active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPage || href.endsWith(currentPage))) {
      link.classList.add('active');
    }
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Form validation helper
  const forms = document.querySelectorAll('.needs-validation');
  forms.forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        event.preventDefault();
        // Demo: show success message
        const successMsg = form.querySelector('.form-success') || createSuccessAlert(form);
        successMsg.classList.remove('d-none');
        form.reset();
        form.classList.remove('was-validated');
        setTimeout(() => successMsg.classList.add('d-none'), 5000);
      }
      form.classList.add('was-validated');
    });
  });

  function createSuccessAlert(form) {
    const div = document.createElement('div');
    div.className = 'alert alert-success form-success mt-3';
    div.innerHTML = '<i class="bi bi-check-circle me-2"></i>Submitted successfully! We will contact you shortly.';
    form.appendChild(div);
    return div;
  }

  // Password toggle
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
      const input = this.previousElementSibling;
      const icon = this.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('bi-eye', 'bi-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('bi-eye-slash', 'bi-eye');
      }
    });
  });

  // Payment plan selection
  document.querySelectorAll('.payment-box').forEach(box => {
    box.addEventListener('click', function () {
      document.querySelectorAll('.payment-box').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // File upload preview for passport
  const passportInput = document.getElementById('passportPhoto');
  if (passportInput) {
    passportInput.addEventListener('change', function () {
      const preview = document.getElementById('passportPreview');
      if (this.files && this.files[0] && preview) {
        const reader = new FileReader();
        reader.onload = e => {
          preview.src = e.target.result;
          preview.classList.remove('d-none');
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
  }

  // Receipt upload
  const receiptInput = document.getElementById('paymentReceipt');
  if (receiptInput) {
    receiptInput.addEventListener('change', function () {
      const label = document.getElementById('receiptLabel');
      if (this.files && this.files[0] && label) {
        label.textContent = this.files[0].name;
      }
    });
  }

  // Counter animation for stats
  const counters = document.querySelectorAll('.counter');
  if (counters.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target || el.textContent);
          let current = 0;
          const increment = target / 40;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              el.textContent = target + (el.dataset.suffix || '');
              clearInterval(timer);
            } else {
              el.textContent = Math.floor(current) + (el.dataset.suffix || '');
            }
          }, 30);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  }

  // Portal sidebar toggle for mobile
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.querySelector('.portal-sidebar')?.classList.toggle('d-none');
    });
  }
});

// Simple client-side login demo (replace with real backend)
function demoLogin(e, role) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('[name="email"]').value;
  const password = form.querySelector('[name="password"]').value;
  if (email && password) {
    if (role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'student-dashboard.html';
    }
  }
}