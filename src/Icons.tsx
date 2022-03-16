import { SVGProps } from "react";

export const Arrow = (
  props: { right?: boolean; left?: boolean } & SVGProps<SVGSVGElement>
) => (
  <svg
    {...{ ...props, right: undefined, left: undefined }}
    width="32"
    transform={props.right ? "" : "scale(-1,1)"}
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="16"
      cy="16"
      r="12.125"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M9.5 15.125C9.01675 15.125 8.625 15.5168 8.625 16C8.625 16.4832 9.01675 16.875 9.5 16.875L9.5 15.125ZM23.1187 16.6187C23.4604 16.277 23.4604 15.723 23.1187 15.3813L17.5503 9.81281C17.2085 9.47111 16.6545 9.47111 16.3128 9.81282C15.9711 10.1545 15.9711 10.7085 16.3128 11.0503L21.2626 16L16.3128 20.9497C15.9711 21.2915 15.9711 21.8455 16.3128 22.1872C16.6545 22.5289 17.2085 22.5289 17.5503 22.1872L23.1187 16.6187ZM9.5 16.875L22.5 16.875L22.5 15.125L9.5 15.125L9.5 16.875Z"
      fill="currentColor"
    />
  </svg>
);

export const NewCard = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.90725 12.2223C5.82662 10.7071 6.90307 9.34559 8.43478 9.10333L23.7185 6.68602C25.355 6.42719 26.8915 7.54402 27.1503 9.18053L28.4494 17.3942C28.6894 18.9117 27.7465 20.3432 26.3033 20.7498C26.3321 22.2846 25.2258 23.6446 23.6666 23.8912L8.51489 26.2876C6.81019 26.5573 5.20968 25.3939 4.94006 23.6892L3.67894 15.7156C3.42933 14.1374 4.40794 12.6485 5.90725 12.2223ZM6.17001 13.9877C5.63638 14.2438 5.31025 14.8276 5.40746 15.4422L6.66858 23.4158C6.78721 24.1659 7.49143 24.6778 8.2415 24.5591L23.3932 22.1627C23.9858 22.069 24.4297 21.6097 24.5315 21.0512L10.6712 23.2434C9.03468 23.5022 7.4982 22.3854 7.23937 20.7488L6.17001 13.9877ZM21.0491 15.0345C21.4152 14.9766 21.665 14.6329 21.6071 14.2669C21.5492 13.9008 21.2055 13.651 20.8394 13.7089L17.7528 14.1971L17.2646 11.1104C17.2067 10.7444 16.8631 10.4946 16.497 10.5525C16.1309 10.6104 15.8811 10.954 15.939 11.3201L16.4272 14.4067L13.3406 14.8949C12.9745 14.9528 12.7247 15.2965 12.7826 15.6626C12.8405 16.0286 13.1842 16.2784 13.5502 16.2206L16.6369 15.7324L17.125 18.819C17.1829 19.1851 17.5266 19.4349 17.8927 19.377C18.2588 19.3191 18.5086 18.9754 18.4507 18.6093L17.9625 15.5227L21.0491 15.0345Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Deck = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24.1115 10.344L27.2468 8.86961L27.9848 10.4389L30.2206 10.4938L29.0567 8.01854C28.5867 7.01897 27.3953 6.5897 26.3957 7.05973L19.6444 10.2345L24.1115 10.344ZM7.6998 18.0614L7.75461 15.8255L2.70188 18.2015C1.70232 18.6716 1.27305 19.8629 1.74308 20.8625L8.60355 35.4518C9.07359 36.4514 10.2649 36.8806 11.2645 36.4106L17.5366 33.4612L13.0695 33.3517L10.4134 34.6007L9.66836 33.0163C8.31521 32.4474 7.38031 31.0936 7.41845 29.5376L7.44888 28.2964L3.55296 20.0114L7.6998 18.0614Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.1656 11.7245L11.4336 11.6085C10.3294 11.5815 9.4123 12.4547 9.38523 13.5589L8.99011 29.6759C8.96304 30.7802 9.83626 31.6973 10.9405 31.7243L14.7844 31.8186L13.5183 31.3991C12.6236 31.1027 11.9192 30.4955 11.4852 29.7371L10.9895 29.7249L11.0235 28.3388C10.9837 28.001 10.9906 27.6542 11.0488 27.3074L11.3846 13.6079L15.5081 13.709L16.1656 11.7245ZM37.545 14.8438L37.5595 14.2496L35.607 14.2017L29.0858 12.0413L37.6086 12.2502C38.7128 12.2773 39.586 13.1944 39.5589 14.2986L39.5295 15.5012L37.545 14.8438Z"
        fill="currentColor"
      />
      <path
        d="M17.7196 12.0412C18.067 10.9927 19.1986 10.4243 20.2471 10.7717L45.1014 19.0059C46.15 19.3533 46.7184 20.4849 46.371 21.5334L41.3008 36.8372C40.9535 37.8858 39.8219 38.4542 38.7733 38.1068L13.919 29.8726C12.8705 29.5252 12.3021 28.3936 12.6495 27.3451L17.7196 12.0412Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Cross = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.6485 2.04853C12.1172 1.5799 12.1172 0.820101 11.6485 0.351472C11.1799 -0.117157 10.4201 -0.117157 9.95147 0.351472L6 4.30294L2.04853 0.351472C1.5799 -0.117157 0.820101 -0.117157 0.351472 0.351472C-0.117157 0.820101 -0.117157 1.5799 0.351472 2.04853L4.30294 6L0.351472 9.95147C-0.117157 10.4201 -0.117157 11.1799 0.351472 11.6485C0.820101 12.1172 1.5799 12.1172 2.04853 11.6485L6 7.69706L9.95147 11.6485C10.4201 12.1172 11.1799 12.1172 11.6485 11.6485C12.1172 11.1799 12.1172 10.4201 11.6485 9.95147L7.69706 6L11.6485 2.04853Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const NewDeck = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.49585 11.1788L2.90026 11.4395C2.77378 11.4949 2.71612 11.6423 2.77148 11.7688L3.44373 13.3047L3.381 15.8635C3.34455 17.3502 4.52023 18.585 6.00695 18.6215L8.02117 18.6708L6.37985 19.3892C5.36797 19.8322 4.18863 19.3709 3.74573 18.359L1.16832 12.4705C0.725423 11.4586 1.18668 10.2793 2.19856 9.83637L3.54319 9.24783L3.49585 11.1788ZM15.458 6.11338C14.9876 5.16111 13.8466 4.73805 12.8635 5.16832L10.9565 6.00303L15.458 6.11338Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.90591 7.08261L6.75191 7.05432C5.64768 7.02725 4.73057 7.90047 4.7035 9.00471L4.54596 15.4307C4.51889 16.5349 5.39211 17.452 6.49635 17.4791L6.61741 17.482C5.58222 16.841 5.08143 15.5529 5.48112 14.3465L6.39035 11.602L6.45297 9.04759C6.45636 8.90957 6.57099 8.80041 6.70902 8.8038L7.3125 8.81859L7.79276 7.36897C7.82545 7.27029 7.8633 7.17477 7.90591 7.08261ZM20.219 8.64909C19.9441 7.90164 19.2347 7.36035 18.3902 7.33964L16.0969 7.28342L20.219 8.64909Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.2707 6.90012C10.2222 6.55274 9.09058 7.12113 8.74321 8.16966L6.72171 14.2714C6.37433 15.3199 6.94273 16.4515 7.99125 16.7989L19.0424 20.4601C20.0909 20.8075 21.2225 20.2391 21.5699 19.1906L23.5914 13.0888C23.9388 12.0403 23.3704 10.9087 22.3218 10.5613L11.2707 6.90012ZM17.8858 14.753C17.8053 14.9963 17.5427 15.1281 17.2995 15.0475L15.2486 14.3681L14.5691 16.419C14.4886 16.6622 14.2261 16.7941 13.9828 16.7135C13.7396 16.6329 13.6077 16.3704 13.6883 16.1272L14.3678 14.0763L12.3169 13.3968C12.0736 13.3162 11.9418 13.0537 12.0224 12.8105C12.103 12.5672 12.3655 12.4354 12.6087 12.516L14.6596 13.1954L15.3391 11.1445C15.4197 10.9013 15.6822 10.7694 15.9254 10.85C16.1686 10.9306 16.3005 11.1931 16.2199 11.4363L15.5404 13.4873L17.5913 14.1667C17.8346 14.2473 17.9664 14.5098 17.8858 14.753Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Shuffle = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM10.4432 11.7741C10.4691 11.9263 10.496 12.0843 10.5261 12.2453L10.526 12.2457C10.6483 12.9002 10.8232 13.6043 11.1994 14.1792C11.2489 14.2549 11.3014 14.3278 11.3569 14.3978L11.3569 14.3977C11.9363 15.1286 12.846 15.5416 14.2177 15.5416L16.2154 15.5416L15.3297 16.4273C15.0866 16.6705 15.0866 17.0647 15.3297 17.3079C15.5729 17.5511 15.9671 17.5511 16.2103 17.3079L18.5186 14.9996L16.2103 12.6913C15.9671 12.4482 15.5729 12.4482 15.3297 12.6913C15.0866 12.9345 15.0866 13.3287 15.3297 13.5719L16.0541 14.2963L14.2177 14.2963C13.0226 14.2963 12.5232 13.9277 12.2417 13.4974C11.9215 13.0081 11.8064 12.3444 11.6585 11.4915L11.6346 11.3542C11.4874 10.509 11.2942 9.48286 10.6489 8.69053C9.96565 7.85159 8.87806 7.38048 7.20182 7.38048L6.12278 7.3805C5.77889 7.3805 5.50012 7.65929 5.50013 8.00317C5.50014 8.34706 5.77892 8.62584 6.12281 8.62583L7.20183 8.62581C8.63891 8.62581 9.31047 9.01917 9.6833 9.47694C10.0941 9.98132 10.2539 10.6842 10.4078 11.5679C10.4195 11.6351 10.4312 11.7037 10.4431 11.7736L10.4431 11.7738L10.4432 11.774L10.4432 11.7741ZM10.3092 13.4487C10.1769 14.09 10.009 14.6152 9.6831 15.0154C9.31027 15.4733 8.63871 15.8668 7.20163 15.8668L6.12261 15.8667C5.77872 15.8667 5.49994 16.1456 5.49993 16.4896C5.49993 16.8335 5.7787 17.1124 6.12258 17.1124L7.20162 17.1124C8.87786 17.1124 9.96545 16.6412 10.6487 15.802C10.8664 15.5347 11.0326 15.2408 11.1629 14.9362C11.0228 14.7893 10.8956 14.6281 10.781 14.453C10.5759 14.1395 10.4248 13.7957 10.3092 13.4487ZM12.1172 11.2121C12.155 11.1358 12.1962 11.0631 12.2415 10.9939C12.523 10.5636 13.0224 10.1949 14.2175 10.1949L16.0538 10.1948L15.3295 10.9193C15.0864 11.1626 15.0864 11.5569 15.3295 11.8001C15.5727 12.0434 15.9669 12.0434 16.2101 11.8001L18.5184 9.49127L16.2101 7.1824C15.9669 6.93917 15.5727 6.93917 15.3295 7.1824C15.0864 7.42563 15.0864 7.81998 15.3295 8.06321L16.2153 8.9492L14.2175 8.94921C13.1236 8.94921 12.3236 9.21194 11.7505 9.68913C11.94 10.2275 12.0389 10.7636 12.1172 11.2121Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const More = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="17" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
};
export const House = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.94652 24.7976V20.1167C7.94652 18.5118 8.58834 16.9607 10.0856 17.7098C11.6167 18.4758 12.2246 20.518 12.2246 21.989V22.6579M7.94652 24.7976L3.93583 22.9254V15.8378L3 15.4367L10.0856 7.27928M7.94652 24.7976L12.2246 22.6579M10.0856 7.27928L17.3048 21.8556M10.0856 7.27928L20.9144 3L22.5946 5.7027M17.3048 21.8556L16.5027 21.5359V28.6757M17.3048 21.8556L28 16.7739L25.973 13.1351M16.5027 28.6757L12.2246 26.6698V22.6579M16.5027 28.6757L26.6631 23.8615V17.4426"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25.9729 8.11598V13.4249L23.8964 14.4866L21.9188 10.4519V8.0098M25.9729 8.11598L23.8964 9.07157L21.9188 8.0098M25.9729 8.11598L23.9953 7.0542L21.9188 8.0098"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const ChatBubble = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.9998 16.7273C10.9998 16.7273 9.18195 17.9666 7.81815 20.0743C6.45435 22.1819 5.99996 24.0548 5.99996 26.9118C5.99996 32.193 10.674 37.4742 21.9855 37.4742C23.2746 37.4742 24.541 37.3451 25.7534 37.0957C26.8189 37.8691 28.1339 38.6505 29.465 39.0611C31.91 39.8153 34.1926 39.3145 35.0283 38.9699C34.2847 38.6438 32.3635 37.6364 31.8877 36.7274C31.412 35.8183 31.4544 34.0001 31.4544 34.0001"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24.892 9C31.1006 9 35.153 10.3026 37.6491 12.6484C40.1533 15.002 41 18.3188 41 22.1241C41 26.2848 38.9438 29.6009 35.8365 31.779C35.9444 32.0224 36.0574 32.2631 36.1747 32.4959C36.5161 33.1735 37.1613 33.8182 37.8667 34.3581C38.566 34.8934 39.2844 35.2954 39.7221 35.4976L40.6426 35.923L39.7125 36.3271C38.7582 36.7418 36.2609 37.3124 33.5852 36.4428C32.198 35.992 30.8461 35.1619 29.7435 34.337C28.5088 34.5898 27.225 34.7202 25.9205 34.7202C19.9476 34.7202 15.6656 33.2511 12.8672 30.9899C10.0629 28.724 8.784 25.6893 8.784 22.652C8.784 17.518 10.5858 14.0692 13.5572 11.9235C16.5016 9.79724 20.5272 9 24.892 9ZM25.3244 16.7606L25.6226 14H24.1614L24.4745 16.7606L21.6414 15.9842L21.4327 17.307L24.1465 17.5226L22.4019 19.7944L23.7289 20.4701L24.8771 17.954L26.1445 20.4701L27.4268 19.7944L25.6525 17.5226L28.3961 17.307L28.1873 15.9842L25.3244 16.7606ZM20.6871 23.2451L20.9853 20.4845H19.5241L19.8372 23.2451L17.0041 22.4687L16.7954 23.7914L19.5092 24.0071L17.7646 26.2788L19.0917 26.9546L20.2398 24.4384L21.5072 26.9546L22.7896 26.2788L21.0152 24.0071L23.7588 23.7914L23.55 22.4687L20.6871 23.2451ZM29.917 23.2451L30.2152 20.4845H28.7539L29.067 23.2451L26.234 22.4687L26.0252 23.7914L28.739 24.0071L26.9944 26.2788L28.3215 26.9546L29.4696 24.4384L30.7371 26.9546L32.0194 26.2788L30.245 24.0071L32.9886 23.7914L32.7799 22.4687L29.917 23.2451Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Information = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        fill="currentColor"
      />
      <path
        d="M12.6432 8.432C12.1952 8.432 11.8805 8.34667 11.6992 8.176C11.5285 8.00533 11.4432 7.79733 11.4432 7.552C11.4432 7.49867 11.4485 7.42933 11.4592 7.344C11.4698 7.25867 11.4858 7.14133 11.5072 6.992C11.5605 6.68267 11.6885 6.44267 11.8912 6.272C12.1045 6.09067 12.4352 6 12.8832 6C13.3312 6 13.6405 6.08533 13.8112 6.256C13.9925 6.42667 14.0832 6.63467 14.0832 6.88C14.0832 6.93333 14.0778 7.00267 14.0672 7.088C14.0565 7.17333 14.0405 7.29067 14.0192 7.44C13.9658 7.74933 13.8325 7.99467 13.6192 8.176C13.4165 8.34667 13.0912 8.432 12.6432 8.432ZM11.8432 18.192C11.2672 18.192 10.8298 18.0427 10.5312 17.744C10.2325 17.4347 10.0832 17.024 10.0832 16.512C10.0832 16.3627 10.0938 16.208 10.1152 16.048C10.1365 15.888 10.1738 15.68 10.2272 15.424L11.0112 11.344H8.35516L8.62716 9.744H13.3152L12.0192 16.496L12.3232 16.592L14.8352 14.176L15.9552 15.184L14.8352 16.368C14.2378 17.008 13.7098 17.472 13.2512 17.76C12.8032 18.048 12.3338 18.192 11.8432 18.192Z"
        fill="currentColor"
      />
    </svg>
  );
};
