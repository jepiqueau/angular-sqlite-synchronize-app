

export const delay = async (dTime: number, message: string): Promise<void> => new Promise ((resolve) => {
  setTimeout(() => {
    const s = '*'.repeat(message.length);
    console.log(`*****************${s}`);
      console.log(`Simulate a delay ${message}`);
      console.log(`*****************${s}`);
      resolve();
    }, dTime * 1000);
});

