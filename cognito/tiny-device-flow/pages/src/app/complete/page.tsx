'use client';
export default function Home(): JSX.Element {
  return (
    <div className="flex flex-col h-screen justify-center items-center bg-gray-200">
      <head>
        <title>Sign in</title>
      </head>
  
      <main>
        <div className="flex justify-center items-center">
          <div className="mb-4">
            <p className="block flex text-green-500 justify-center items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-56 w-56 pt-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </p>
            <p className="block flex text-gray-700 text-5xl mb-2 justify-center items-center pt-8 px-8">Completed</p>
            <p className="block flex text-gray-700 text-base justify-center items-center p-2">You can close this tab.</p>
          </div>
        </div>
      </main>
    </div>
  );
  
}