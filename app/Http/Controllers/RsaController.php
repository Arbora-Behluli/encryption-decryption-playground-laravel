<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RsaService;

class RsaController extends Controller
{
    protected $rsaService;

    public function __construct(RsaService $rsaService)
    {
        $this->rsaService = $rsaService;
    }

    public function index()
    {
        return view('rsa.index');
    }

    public function generate(Request $request)
    {
        $bits = (int) $request->input('bits', 2048);
        try {
            $keys = $this->rsaService->generateKeyPair($bits);
            // We pass keys to view (in real app don't store private key server-side!)
            return back()->with('keys', $keys)->with('success', 'Key pair generated (do not store private key in production).');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function encrypt(Request $request)
    {
        $request->validate([
            'public_key' => 'required|string',
            'plaintext'  => 'required|string',
        ]);

        try {
            $cipher = $this->rsaService->encryptWithPublicKey($request->input('public_key'), $request->input('plaintext'));
            return back()->with('cipher', $cipher)->withInput();
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage())->withInput();
        }
    }

    public function decrypt(Request $request)
    {
        $request->validate([
            'private_key' => 'required|string',
            'ciphertext'  => 'required|string',
        ]);

        try {
            $plain = $this->rsaService->decryptWithPrivateKey($request->input('private_key'), $request->input('ciphertext'));
            return back()->with('plain', $plain)->withInput();
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage())->withInput();
        }
    }
}
