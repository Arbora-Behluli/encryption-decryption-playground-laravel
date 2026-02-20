// ==================== ELEMENTS ====================
const modeSelect = document.getElementById("modeSelect");
const symAlg = document.getElementById("symAlg");
const symKeySize = document.getElementById("symKeySize");

const plaintextEl = document.getElementById("plaintext");
const ciphertextEl = document.getElementById("ciphertext");
const ivOut = document.getElementById("ivOut");
const metaOut = document.getElementById("metaOut");
const decryptedEl = document.getElementById("decrypted");
const metricsEl = document.getElementById("metrics");
const keySummary = document.getElementById("keySummary");
const opSummary = document.getElementById("opSummary");
const historyEl = document.getElementById("history");

const genKeyBtn = document.getElementById("genKeyBtn");
const encryptBtn = document.getElementById("encryptBtn");
const confirmDecryptBtn = document.getElementById("confirmDecryptBtn");
const exportKeyBtn = document.getElementById("exportKeyBtn");
const downloadPublicKeyBtn = document.getElementById("downloadPublicKeyBtn");
const downloadPrivateKeyBtn = document.getElementById("downloadPrivateKeyBtn");


const decryptSection = document.getElementById("decryptSection");
const symDecryptKeyFile = document.getElementById("symDecryptKey");

// -----asymm
const asymmetricOptions = document.getElementById("asymmetricOptions");
const symmetricOptions = document.getElementById("symmetricOptions");

const asymAlg = document.getElementById("asymAlg");
const rsaBits = document.getElementById("rsaBits");
const eccCurve = document.getElementById("eccCurve");
const rsaOptions = document.getElementById("rsaOptions");
const eccOptions = document.getElementById("eccOptions");

// ==================== STATE ====================
const state = {
  key: null,
  rawChaChaKey: null,
  keyType: null,
  lastCipher: null,
  lastIv: null,
  lastMeta: null,
  generatedKeyBlob: null,
  generatedKeyFilename: null,
  publicKey: null,
privateKey: null,
  history: []
};

// ==================== CONFIG ====================
const AES_CONFIG = {
  "AES-GCM": { iv: 12 },
  "AES-CBC": { iv: 16 },
  "AES-CTR": { iv: 16, counter: true }
};

// ==================== UTILS ====================
const te2ab = s => new TextEncoder().encode(s);
const ab2text = b => new TextDecoder().decode(b);

const ab2b64 = buf =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const b642ab = b64 =>
  Uint8Array.from(atob(b64), c => c.charCodeAt(0));

// ==================== BENCHMARK ====================
async function benchmark(fn, runs) {
  let total = 0, result;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    result = await fn();
    total += performance.now() - t0;
  }
  return { result, avg: total / runs };
}

// ==================== KEY GENERATION ====================
async function generateAESKey(alg) {
  state.key = await crypto.subtle.generateKey(
    { name: alg, length: +symKeySize.value },
    true,
    ["encrypt", "decrypt"]
  );

  const jwk = await crypto.subtle.exportKey("jwk", state.key);
  state.generatedKeyBlob = new Blob(
    [JSON.stringify(jwk, null, 2)],
    { type: "application/json" }
  );
  state.generatedKeyFilename = `${alg.toLowerCase()}-key.jwk`;
  state.keyType = "sym";

  keySummary.textContent = `${alg} ${symKeySize.value}-bit key generated`;
}

// ==================== AES ENCRYPT ====================
async function encryptAES(plaintext, alg) {
  if (!state.key) await generateAESKey(alg);

  const cfg = AES_CONFIG[alg];
  const iv = crypto.getRandomValues(new Uint8Array(cfg.iv));

  const params = cfg.counter
    ? { name: alg, counter: iv, length: 64 }
    : { name: alg, iv };

  const ct = await crypto.subtle.encrypt(params, state.key, plaintext);

  return { ciphertext: new Uint8Array(ct), iv };
}

// ==================== AES DECRYPT ====================
async function decryptAES(jwk, alg) {
  const cfg = AES_CONFIG[alg];

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: alg },
    false,
    ["decrypt"]
  );

  const params = cfg.counter
    ? { name: alg, counter: state.lastIv, length: 64 }
    : { name: alg, iv: state.lastIv };

  const pt = await crypto.subtle.decrypt(
    params,
    key,
    state.lastCipher
  );

  return ab2text(pt);
}

// ==================== CHACHA20 ====================
function getChaCha() {
  if (!window.ChaCha20Poly1305)
    throw new Error("ChaCha20 library not loaded");
  return window.ChaCha20Poly1305;
}

async function encryptChaCha20(plaintext) {
  const ChaCha = getChaCha();
  const key = crypto.getRandomValues(new Uint8Array(32));
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  const cipher = new ChaCha(key);
  const ct = cipher.seal(nonce, plaintext);

  state.rawChaChaKey = key;
  state.generatedKeyBlob = new Blob(
    [JSON.stringify({ key: ab2b64(key) }, null, 2)],
    { type: "application/json" }
  );
  state.generatedKeyFilename = "chacha20-key.json";
  state.keyType = "chacha";

  keySummary.textContent = "ChaCha20 key generated";

  return { ciphertext: ct, iv: nonce };
}

async function decryptChaCha20(keyB64) {
  const ChaCha = getChaCha();
  const key = b642ab(keyB64);
  const cipher = new ChaCha(key);

  const pt = cipher.open(state.lastIv, state.lastCipher);
  if (!pt) throw new Error("Authentication failed");

  return ab2text(pt);
}

modeSelect.onchange = () => {
  const isSym = modeSelect.value === "symmetric";

  symmetricOptions.classList.toggle("d-none", !isSym);
  asymmetricOptions.classList.toggle("d-none", isSym);

  // Reset buttons
  if (exportKeyBtn) {
    exportKeyBtn.disabled = true;
    exportKeyBtn.classList.add("d-none"); // <-- fsheh në ndryshim mode
  }
  if (downloadPublicKeyBtn) downloadPublicKeyBtn.disabled = true;
  if (downloadPrivateKeyBtn) downloadPrivateKeyBtn.disabled = true;

  keySummary.textContent = "";
  opSummary.textContent = "";
};




modeSelect.dispatchEvent(new Event("change"));
// asymAlg.dispatchEvent(new Event("change"));

async function generateRSA() {
  const bits = +rsaBits.value;

  const hash =
    asymAlg.value === "RSA-OAEP-512"
      ? "SHA-512"
      : "SHA-256";

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: bits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: hash }
    },
    true,
    ["encrypt", "decrypt"]
  );

  state.publicKey = keyPair.publicKey;
  state.privateKey = keyPair.privateKey;
  state.keyType = "rsa";

  // Export private key
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  state.generatedKeyBlob = new Blob(
    [JSON.stringify(privateJwk, null, 2)],
    { type: "application/json" }
  );
  state.generatedKeyFilename = `rsa-${bits}-${hash.toLowerCase()}-private.jwk`;

  // Export public key
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  state.generatedPublicKeyBlob = new Blob(
    [JSON.stringify(publicJwk, null, 2)],
    { type: "application/json" }
  );
  state.generatedPublicKeyFilename = `rsa-${bits}-${hash.toLowerCase()}-public.jwk`;

  // Update UI
  keySummary.textContent = `RSA-OAEP ${bits}-bit (${hash}) keypair generated`;

  // Show & enable export buttons
  asymExportBtns.classList.remove("d-none");
  downloadPublicKeyBtn.disabled = false;
  downloadPrivateKeyBtn.disabled = false;
}




async function encryptRSA(plaintext) {
  if (!state.publicKey) await generateRSA();

  const ct = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    state.publicKey,
    plaintext
  );

  return {
    ciphertext: new Uint8Array(ct),
    iv: null
  };
}


async function decryptRSA(jwkPrivate) {
  const hash =
    state.lastMeta.alg === "RSA-OAEP-512"
      ? "SHA-512"
      : "SHA-256";

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwkPrivate,
    {
      name: "RSA-OAEP",
      hash: { name: hash }
    },
    false,
    ["decrypt"]
  );

  const pt = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    state.lastCipher
  );

  return ab2text(pt);
}


// ==================== EVENTS ====================
genKeyBtn.onclick = async () => {
  try {

    // ============ SYMMETRIC ============
if (modeSelect.value === "symmetric") {
  if (symAlg.value.startsWith("AES-")) {
    await generateAESKey(symAlg.value);
  } else {
    await encryptChaCha20(new Uint8Array());
  }

  if (asymExportBtns) asymExportBtns.classList.add("d-none");

  if (exportKeyBtn) {
    exportKeyBtn.disabled = false;
    exportKeyBtn.classList.remove("d-none"); 
  }

  opSummary.textContent = "Symmetric key generated ✔";
  return;
}


    // ============ ASYMMETRIC ============
if (modeSelect.value === "asymmetric") {
  // Gjenero çelës për të gjitha variantet RSA-OAEP
  if (asymAlg.value.startsWith("RSA-OAEP")) {
    await generateRSA(); // kjo tashmë zgjedh hash bazuar tek asymAlg.value
  }

  // Shfaq export buttons
  const asymExportBtns = document.getElementById("asymExportBtns");
  if (asymExportBtns) asymExportBtns.classList.remove("d-none");

  downloadPublicKeyBtn.disabled = false;
  downloadPrivateKeyBtn.disabled = false;

  opSummary.textContent = "Asymmetric key generated ✔";
}



  } catch (e) {
    alert(e.message);
  }
};

encryptBtn.onclick = async () => {
  try {
    const plaintext = te2ab(plaintextEl.value);
    const runs = +document.getElementById("runs").value || 1;

    let out, avg;

    // ===== set meta FIRST =====
    state.lastMeta = {
      alg:
        modeSelect.value === "symmetric"
          ? symAlg.value
          : asymAlg.value
    };

    // ================= SYMMETRIC =================
    if (modeSelect.value === "symmetric") {
      const alg = symAlg.value;
      if (alg.startsWith("AES-")) {
        ({ result: out, avg } = await benchmark(
          () => encryptAES(plaintext, alg),
          runs
        ));
      } else {
        ({ result: out, avg } = await benchmark(
          () => encryptChaCha20(plaintext),
          runs
        ));
      }
    }

    // ================= ASYMMETRIC =================
    if (modeSelect.value === "asymmetric") {
      if (asymAlg.value.startsWith("RSA-OAEP")) {
        ({ result: out, avg } = await benchmark(
          () => encryptRSA(plaintext),
          runs
        ));
      }
    }

    metricsEl.textContent = `Avg time: ${avg.toFixed(2)} ms`;

    // ===== UPDATE LAST CIPHER & IV =====
    state.lastCipher = out.ciphertext;
    state.lastIv = out.iv;

    ciphertextEl.textContent = ab2b64(out.ciphertext);
    ivOut.textContent = out.iv ? ab2b64(out.iv) : "—";
    metaOut.textContent = JSON.stringify(state.lastMeta, null, 2);

    opSummary.textContent = "Encrypt complete ✔";

    // ===== UPDATE HISTORY / QUICK COMPARE =====
    const algName = state.lastMeta.alg;
    const existing = state.history.find(h => h.alg === algName);
    if (existing) {
      existing.avg = avg; // përditëso vlerën nëse ekziston
    } else {
      state.history.push({ alg: algName, avg });
    }

    historyEl.textContent = state.history
      .map(h => `${h.alg}: Avg ${h.avg.toFixed(2)} ms`)
      .join('\n');

    // ===== SHOW DECRYPT SECTION =====
    decryptSection.classList.remove("d-none");
    const symDecryptInputs = document.getElementById("symDecryptInputs");
    const asymDecryptInputs = document.getElementById("asymDecryptInputs");

    if (state.lastMeta.alg.startsWith("AES-") || state.lastMeta.alg === "CHACHA20") {
      if (symDecryptInputs) symDecryptInputs.classList.remove("d-none");
      if (asymDecryptInputs) asymDecryptInputs.classList.add("d-none");
    }
    if (state.lastMeta.alg.startsWith("RSA-OAEP")) {
      if (symDecryptInputs) symDecryptInputs.classList.add("d-none");
      if (asymDecryptInputs) asymDecryptInputs.classList.remove("d-none");
    }

  } catch (e) {
    alert(e.message);
  }
};


confirmDecryptBtn.onclick = async () => {
  try {
    const alg = state.lastMeta.alg;
    let result;

    const runs = +document.getElementById("runs").value || 1;
    let totalTime = 0;

    for (let i = 0; i < runs; i++) {
      const t0 = performance.now();

      // SYMMETRIC
      if (alg.startsWith("AES-")) {
        if (!symDecryptKeyFile.files.length)
          throw new Error("Please upload symmetric key file");
        const text = await symDecryptKeyFile.files[0].text();
        result = await decryptAES(JSON.parse(text), alg);
      }

      if (alg === "CHACHA20") {
        const text = await symDecryptKeyFile.files[0].text();
        result = await decryptChaCha20(JSON.parse(text).key);
      }

      // RSA
      if (alg.startsWith("RSA-OAEP")) {
        const file = document.getElementById("rsaPrivateKey").files[0];
        if (!file) throw new Error("Please upload RSA private key");
        const text = await file.text();
        result = await decryptRSA(JSON.parse(text));
      }

      totalTime += performance.now() - t0;
    }

    const avgDecrypt = totalTime / runs;

    decryptedEl.textContent = result;
    opSummary.textContent = "Decrypt successful ✔";

    // Shfaq kohën mesatare të dekriptimit
    document.getElementById("decryptMetrics").textContent = `Avg time: ${avgDecrypt.toFixed(2)} ms`;

  } catch (e) {
    decryptedEl.textContent = "❌ " + e.message;
    document.getElementById("decryptMetrics").textContent = "—";
  }
};


exportKeyBtn.onclick = () => {
  if (!state.generatedKeyBlob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(state.generatedKeyBlob);
  a.download = state.generatedKeyFilename;
  a.click();
};

function downloadKey(jwk, filename) {
  const blob = new Blob(
    [JSON.stringify(jwk, null, 2)],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

downloadPublicKeyBtn.onclick = async () => {
  if (!state.publicKey) return alert("No public key generated");

  const jwk = await crypto.subtle.exportKey(
    "jwk",
    state.publicKey
  );
  downloadKey(jwk, "rsa-public.jwk");
};

downloadPrivateKeyBtn.onclick = async () => {
  if (!state.privateKey) return alert("No private key generated");

  const jwk = await crypto.subtle.exportKey(
    "jwk",
    state.privateKey
  );
  downloadKey(jwk, "rsa-private.jwk");
};
