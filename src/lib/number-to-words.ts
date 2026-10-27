/**
 * Convert number amount to words in Bangladeshi Taka format (Lakh, Crore, Thousand)
 */
export function numberToTakaWords(num: number): string {
  if (isNaN(num) || num === 0) return "Taka Zero Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertNumber(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        "Hundred " +
        (n % 100 !== 0 ? "and " + convertNumber(n % 100) : "")
      );
    if (n < 100000)
      return (
        convertNumber(Math.floor(n / 1000)) +
        "Thousand " +
        (n % 1000 !== 0 ? convertNumber(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convertNumber(Math.floor(n / 100000)) +
        "Lakh " +
        (n % 100000 !== 0 ? convertNumber(n % 100000) : "")
      );
    return (
      convertNumber(Math.floor(n / 10000000)) +
      "Crore " +
      (n % 10000000 !== 0 ? convertNumber(n % 10000000) : "")
    );
  }

  const rounded = Math.floor(Math.abs(num));
  const paisa = Math.round((Math.abs(num) - rounded) * 100);

  let result = "Taka " + convertNumber(rounded).trim();
  if (paisa > 0) {
    result += " and " + convertNumber(paisa).trim() + " Paisa";
  }

  return result + " Only";
}
