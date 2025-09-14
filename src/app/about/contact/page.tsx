export default function contactUs() {
  return (
    <div className="p-10 flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4 flex ">Contact Us</h1>
      <p className="mb-4">
        If you have any questions or would like to get in touch, please feel free to reach out to us.
      </p>
      <p className="text-orange-500">
        You can contact us via email at Email:
        <span className="font-bold text-blue-200"> <a href="mailto:farisganteng123@gmail.com">farisganteng123@gmail.com</a>.</span>
      </p>
    </div>
  );
}
