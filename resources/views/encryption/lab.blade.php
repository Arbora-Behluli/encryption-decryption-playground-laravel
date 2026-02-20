<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Encryption Lab</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="{{ asset('css/encryption.css') }}" rel="stylesheet">

  
</head>
<body>
  <div class="container-lg">
    <h2 class="text-center mb-4">Encryption/Decryption Playground (Web Crypto)</h2>

    <div class="row g-4">
      <!-- LEFT: Controls / Form -->
      <div class="col-lg-6">
        <div class="card p-4">
          <h5>Input & Settings</h5>
          <p class="small-muted">Select input, algorithm, and parameters. Operations will run in the browser (private).</p>

          <div class="mb-3">
            <label class="form-label">Mode</label>
            <select id="modeSelect" class="form-select">
              <option value="symmetric" selected>Symmetric (AES-GCM / ChaCha20 - polyfill)</option>
              <option value="asymmetric">Asymmetric (RSA-OAEP)</option>
            </select>
          </div>

          <div id="symmetricOptions" class="mb-3">
            <label class="form-label">Algorithm</label>
            <select id="symAlg" class="form-select mb-2">
              <option value="AES-GCM" selected>AES-GCM (recommended)</option>
              <option value="AES-CBC">AES-CBC (older, needs padding + IV)</option>
              <option value="AES-CTR">AES-CTR (stream style, no authentication)</option>
              <option value="CHACHA20">ChaCha20-Poly1305 (Polyfill)</option>
            </select>
            <div class="row g-2">
              <div class="col-6">
                <label class="form-label">Key size (bits)</label>
                <select id="symKeySize" class="form-select mono">
                  <option>128</option>
                  <option selected>256</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label">IV size (bytes)</label>
                <input id="symIvSize" type="number" class="form-control mono" value="12" min="8" max="16">
              </div>
            </div>
          </div>

          <div id="asymmetricOptions" class="mb-3 d-none">
            <label class="form-label">Asymmetric Algorithm</label>
            <select id="asymAlg" class="form-select mb-2">
              <option value="RSA-OAEP" selected>RSA-OAEP (SHA-256)</option>
              <option value="RSA-OAEP-512">RSA-OAEP (SHA-512)</option>
            </select>

            <div id="rsaOptions" class="mb-2">
              <label class="form-label">RSA modulus bits</label>
              <select id="rsaBits" class="form-select mono">
                <option>1024</option>
                <option selected>2048</option>
                <option>4096</option>
              </select>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Input (text)</label>
            <textarea id="plaintext" rows="6" class="form-control mono" placeholder="Shkruaj tekstin këtu...">Example text to encrypt</textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Benchmark runs</label>
            <input id="runs" type="number" class="form-control mono" value="5" min="1" max="200">
            <div class="small-muted mt-1">Average execution time (ms) will be calculated for the specified number of runs.</div>
          </div>

          <div class="d-flex gap-2">
            <button id="genKeyBtn" class="btn btn-outline-primary">Generate Key</button>
            <button id="encryptBtn" class="btn btn-primary">Encrypt & Benchmark</button>
          </div>

          <hr class="my-3">

          <div>
            <div class="d-flex align-items-start mb-2">
              <div class="step-badge">1</div>
              <div>
                <div class="small-muted">Key</div>
                <div id="keySummary" class="mono">No key generated</div>
              </div>
            </div>

            <div class="d-flex align-items-start mb-2">
              <div class="step-badge" style="background:#198754">2</div>
              <div>
                <div class="small-muted">Last operation</div>
                <div id="opSummary" class="mono">—</div>
              </div>
            </div>

            <div class="d-flex align-items-start">
              <div class="step-badge" style="background:#6f42c1">3</div>
              <div>
                <div class="small-muted">Metrics</div>
                <div id="metrics" class="mono">—</div>
              </div>
            </div>

            <div class="d-flex align-items-start">
              <div class="step-badge" style="background:#c14251">4</div>
              <div>
                <div class="small-muted">Decryption Metrics</div>
                <div id="decryptMetrics" class="mono">—</div>
                </div>
</div>

          </div>

        </div>
      </div>

     <!-- RIGHT: Results / Visualization -->
<div class="col-lg-6">
  <div class="card p-4">
    <h5>Result & Visualization</h5>

    <div class="mb-3">
      <label class="form-label">Ciphertext (Base64)</label>
      <pre id="ciphertext" class="mono">—</pre>
    </div>

    <div class="mb-3 row">
      <div class="col-6">
        <label class="form-label">IV / Ephemeral</label>
        <pre id="ivOut" class="mono">—</pre>
      </div>
      <div class="col-6">
        <label class="form-label">Additional metadata (JSON)</label>
        <pre id="metaOut" class="mono">—</pre>
      </div>
    </div>

    <!-- EXPORT BUTTONS -->
    <div class="d-flex gap-2 mb-3">
      <!-- SYMMETRIC -->
      <button id="exportKeyBtn"
              class="btn btn-outline-secondary d-none"
              disabled>
        Export Key
      </button>

      <!-- ASYMMETRIC -->
      <div id="asymExportBtns" class="d-none">
        <button id="downloadPublicKeyBtn"
                class="btn btn-outline-primary"
                disabled>
          Export Public Key
        </button>
        <button id="downloadPrivateKeyBtn"
                class="btn btn-outline-danger"
                disabled>
          Export Private Key
        </button>
      </div>
    </div>

    <!-- DECRYPT SECTION -->
    <div id="decryptSection" class="card p-3 mt-3 d-none">
      <h6>Provide keys for decryption</h6>

      <!-- SYMMETRIC -->
      <div id="symDecryptInputs" class="d-none">
        <label class="form-label">Symmetric Key (JWK)</label>
        <input id="symDecryptKey" type="file" class="form-control">
      </div>

      <!-- ASYMMETRIC -->
      <div id="asymDecryptInputs" class="d-none">
        <label class="form-label">RSA Private Key (JWK)</label>
        <input id="rsaPrivateKey" type="file" class="form-control">
      </div>

      <button id="confirmDecryptBtn"
              class="btn btn-success mt-2">
        Confirm Decrypt
      </button>
    </div>

    <div class="mt-3">
  <label class="form-label">Decrypted Text</label>
  <pre id="decrypted" class="mono">—</pre>
</div>


    <div class="mt-3">
      <h6>Quick Compare</h6>
      <pre id="history" class="mono"></pre>
    </div>
  </div>
</div>


    <!-- Notes -->
    <div class="mt-4 card p-3 small-muted">
      <strong>Technical note:</strong> This module uses the Web Crypto API (SubtleCrypto). RSA-OAEP is suitable for encrypting small data (e.g., keys). For large messages, a hybrid scheme is used: generate a symmetric key and encrypt the key with RSA.
    </div>

  </div>

<script src="{{ asset('js/chacha20.js') }}"></script>

<script> console.log("ChaCha20 loaded?", window.ChaCha20Poly1305);</script>

<script src="{{ asset('js/encryption.js') }}"></script>

</body>
</html>
 


