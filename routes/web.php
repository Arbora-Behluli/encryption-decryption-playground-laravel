<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RsaController;

Route::get('/', function () {
    return view('welcome');
});


Route::get('/rsa', [RsaController::class, 'index'])->name('rsa.index');
Route::post('/rsa/generate', [RsaController::class, 'generate'])->name('rsa.generate');
Route::post('/rsa/encrypt', [RsaController::class, 'encrypt'])->name('rsa.encrypt');
Route::post('/rsa/decrypt', [RsaController::class, 'decrypt'])->name('rsa.decrypt');

Route::get('/encryption', fn()=>view('encryption.lab'))->name('encryption.lab');
