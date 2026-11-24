// Structures and approximate values from the existing Sydlik pKa flashcards.
const pkaDeck = (() => {
    const line = (x1, y1, x2, y2) =>
      `<line class="bond" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const atom = (x, y, label, acidic = false) =>
      `<text x="${x}" y="${y}" class="${acidic ? "acidic" : ""}">${label}</text>`;
    const molecule = body =>
      `<svg class="molecule" viewBox="0 0 360 160" role="img" aria-label="Chemical structure">${body}</svg>`;
    const ring = () => [
      `<polygon class="bond" fill="none" points="92,80 122,28 182,28 212,80 182,132 122,132"/>`,
      line(128, 39, 174, 39), line(197, 81, 175, 119), line(128, 121, 105, 81)
    ].join("");

    const cards = [
      {
        label: "Alkane C-H", answer: "pKa ≈ 50", structures: [
          molecule(line(35, 105, 85, 68) + line(85, 68, 140, 105) + line(140, 105, 195, 68) + line(195, 68, 245, 105) + atom(272, 106, "H", true)),
          molecule(line(45, 65, 100, 100) + line(100, 100, 155, 65) + line(155, 65, 210, 100) + line(210, 100, 255, 70) + atom(282, 68, "H", true))
        ]
      },
      {
        label: "Vinylic C-H", answer: "pKa ≈ 45", structures: [
          molecule(line(35, 105, 92, 72) + line(92, 72, 155, 104) + line(94, 61, 157, 93) + line(155, 104, 220, 70) + line(155, 104, 211, 135) + atom(239, 143, "H", true))
        ]
      },
      {
        label: "Terminal alkyne C-H", answer: "pKa ≈ 25", structures: [
          molecule(line(38, 98, 98, 65) + line(98, 65, 170, 65) + line(98, 56, 170, 56) + line(98, 74, 170, 74) + line(170, 65, 246, 65) + atom(275, 65, "H", true))
        ]
      },
      {
        label: "Hydrochloric acid", answer: "pKa ≈ -7", structures: [
          molecule(atom(125, 80, "H", true) + line(149, 80, 211, 80) + atom(244, 80, "Cl"))
        ]
      },
      {
        label: "Hydronium", answer: "pKa ≈ -1.7", structures: [
          molecule(atom(180, 76, "O⁺") + line(154, 76, 105, 76) + atom(78, 76, "H", true) + line(206, 76, 255, 76) + atom(282, 76, "H") + line(180, 100, 180, 132) + atom(180, 148, "H"))
        ]
      },
      {
        label: "Water", answer: "pKa ≈ 16", structures: [
          molecule(atom(180, 80, "O") + line(153, 80, 105, 80) + atom(78, 80, "H", true) + line(207, 80, 255, 80) + atom(282, 80, "H"))
        ]
      },
      {
        label: "Alcohol", answer: "pKa ≈ 16", structures: [
          molecule(line(35, 105, 90, 70) + line(90, 70, 145, 105) + line(145, 105, 200, 70) + atom(230, 70, "O") + line(248, 70, 282, 70) + atom(307, 70, "H", true)),
          molecule(line(45, 105, 105, 70) + line(105, 70, 165, 105) + atom(197, 105, "O") + line(216, 105, 260, 105) + atom(287, 105, "H", true))
        ]
      },
      {
        label: "Phenol", answer: "pKa ≈ 10", structures: [
          molecule(ring() + line(212, 80, 256, 80) + atom(278, 80, "O") + line(296, 80, 323, 80) + atom(344, 80, "H", true))
        ]
      },
      {
        label: "Carboxylic acid", answer: "pKa ≈ 5", structures: [
          molecule(line(30, 105, 88, 70) + line(88, 70, 145, 105) + line(145, 105, 205, 70) + line(202, 66, 202, 25) + line(212, 70, 212, 29) + atom(207, 11, "O") + line(205, 70, 255, 102) + atom(278, 103, "O") + line(296, 103, 324, 103) + atom(345, 103, "H", true)),
          molecule(line(55, 95, 120, 60) + line(120, 60, 185, 95) + line(182, 91, 182, 42) + line(192, 95, 192, 46) + atom(187, 24, "O") + line(185, 95, 240, 65) + atom(262, 65, "O") + line(280, 65, 310, 65) + atom(333, 65, "H", true))
        ]
      },
      {
        label: "Amide N-H", answer: "pKa ≈ 17", structures: [
          molecule(line(40, 103, 105, 68) + line(105, 68, 172, 103) + line(169, 99, 169, 49) + line(179, 103, 179, 53) + atom(174, 30, "O") + line(172, 103, 226, 72) + atom(250, 72, "N") + line(266, 62, 301, 38) + atom(325, 28, "H", true) + line(267, 82, 302, 108) + atom(326, 119, "H"))
        ]
      },
      {
        label: "Amine N-H", answer: "pKa ≈ 35", structures: [
          molecule(line(38, 105, 95, 70) + line(95, 70, 152, 105) + line(152, 105, 208, 70) + atom(235, 70, "N") + line(251, 59, 286, 35) + atom(310, 25, "H", true) + line(252, 82, 287, 108) + atom(311, 118, "H")),
          molecule(line(55, 100, 115, 65) + line(115, 65, 175, 100) + atom(203, 100, "N") + line(220, 89, 260, 61) + atom(285, 50, "H", true) + line(220, 110, 260, 132) + atom(286, 139, "H"))
        ]
      },
      {
        label: "Ammonium", answer: "pKa ≈ 10", structures: [
          molecule(line(35, 110, 90, 75) + line(90, 75, 145, 110) + line(145, 110, 195, 80) + atom(224, 80, "N⁺") + line(245, 68, 282, 40) + atom(307, 30, "H", true) + line(248, 80, 292, 80) + atom(318, 80, "H") + line(244, 93, 282, 122) + atom(307, 133, "H"))
        ]
      },
      {
        label: "C-H alpha to one carbonyl", answer: "pKa ≈ 20", structures: [
          molecule(line(25, 105, 80, 70) + line(80, 70, 138, 105) + line(135, 101, 135, 52) + line(145, 105, 145, 56) + atom(140, 34, "O") + line(138, 105, 200, 70) + line(200, 70, 258, 105) + line(258, 105, 300, 80) + line(200, 70, 200, 35) + atom(200, 18, "H", true)),
          molecule(line(35, 95, 100, 60) + line(100, 60, 165, 95) + line(162, 91, 162, 42) + line(172, 95, 172, 46) + atom(167, 24, "O") + line(165, 95, 230, 60) + line(230, 60, 292, 95) + line(230, 60, 230, 28) + atom(230, 13, "H", true))
        ]
      },
      {
        label: "C-H between two carbonyls", answer: "pKa ≈ 11", structures: [
          molecule(line(15, 108, 70, 75) + line(70, 75, 125, 108) + line(122, 104, 122, 54) + line(132, 108, 132, 58) + atom(127, 36, "O") + line(125, 108, 185, 75) + line(185, 75, 245, 108) + line(242, 104, 242, 54) + line(252, 108, 252, 58) + atom(247, 36, "O") + line(245, 108, 305, 75) + line(185, 75, 185, 38) + atom(185, 21, "H", true))
        ]
      },
      {
        label: "Thiol", answer: "pKa ≈ 12", structures: [
          molecule(line(40, 105, 95, 70) + line(95, 70, 150, 105) + line(150, 105, 205, 70) + atom(233, 70, "S") + line(250, 70, 286, 70) + atom(312, 70, "H", true)),
          molecule(line(50, 70, 110, 105) + line(110, 105, 170, 70) + atom(200, 70, "S") + line(218, 70, 258, 70) + atom(285, 70, "H", true))
        ]
      },
      {
        label: "Thiophenol", answer: "pKa ≈ 7", structures: [
          molecule(ring() + line(212, 80, 258, 80) + atom(281, 80, "S") + line(299, 80, 326, 80) + atom(347, 80, "H", true))
        ]
      }
    ];

  return cards.map((card, index) => ({...card, id: index + 1}));
})();
