'use client';
import React from 'react';
import Head from 'next/head';

export default function Home(): JSX.Element {
  return (
    <div className="flex flex-col h-screen justify-center items-center bg-gray-200">
      <Head>
        <title>Sign in</title>
      </Head>

      <main>
        <div className="flex justify-center items-center">
          <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" action="/oauth/device/activate" method="POST">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="user_code">
                Input code
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="user_code"
                name="user_code"
                type="text"
                placeholder="CODE"
              />
            </div>
            <div className="flex items-center justify-center">
              <input
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
                value="Sign In"
              />
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
