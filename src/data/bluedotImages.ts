/**
 * Image file IDs from the Drive folder used as the BlueDot slideshow texture set.
 * Source: https://drive.google.com/drive/folders/1Na7xmitAhc3tRrkwXQoBdZmt0hQtfkig
 *
 * URLs are built via lh3.googleusercontent.com which serves images directly with
 * CORS=* (verified). Append =s{size} to scale; s1024 ≈ 100 KB per JPG.
 *
 * To refresh after adding/removing photos in the Drive folder, re-scrape the
 * folder HTML for file IDs (start-with `1`, 33 chars, alnum/-/_) and replace
 * this array.
 */
export const BLUE_DOT_FILE_IDS: string[] = [
  '1_XlRJRt_op-qaUKtfs_DE1qNHJ7IIeUd',
  '1-5UCtLfjYygMhjWaKHRZdxfHkANT8aNJ',
  '1-vDOj7GqgVwq6kGFLtSnsSpAR0xYrdRc',
  '102drVWVfLAPutNemZQg1Rs44ht45zzyn',
  '14mSXhZ74l1i_3lJLprDxg0rLOjKu1y5H',
  '15fqwFMGNim_mH5VhdeyxXqJS-x2z6P4f',
  '15mXm4enuZ5OHYa5600WYu3il-3M4Jr8n',
  '173XTwH5XO5jCuSAbjnCDc-FvNRZrU6Kl',
  '187VeRU1QJIC6sC444U3xGd9WSMmtUBbN',
  '19u-9tSymvDbjLR23NeRfJaiVYUM186yC',
  '1AF6rLKBzL7aaZkVrrYkTkm84S75KyMR2',
  '1aivtG3B7PL-MGUcXOL_5NYJXbxtfHv1U',
  '1aOP-L2YJcQBXzW28-QboOUOBxNNe9d6v',
  '1b9oSRSJt3wVNj5frP5Z-I-rLf0SAYz3O',
  '1cvSBDrt-E4ysIOlBysRMjhhNAqqYrLQo',
  '1EIngUVKqbLxvrqV3oLPffj1bHMmdf-xq',
  '1fJh09YJA08zwvWsdtJvwDL3BMX1f7UKJ',
  '1FLeUdd_3RbVXzFx7IYiIwC2YGs1jPrFX',
  '1H5uUvypOmqBk6niAdQ9ztZ6aBalNSZKy',
  '1hnomlgcGI2Et59vnBioa8YNuLj5dVNra',
  '1I7SL7YLzZt4ypxF2UuM9CaIhtKNTviEx',
  '1ITPNdMn_vpXP7GInD53XThSwTEBeUuvm',
  '1j7h0PpZXeM-DxL2TEr4LttbSRgYOBcvS',
  '1Jpt-UOcHZjicQKBq52TnOFEB6Tj0bh75',
  '1jutgxfE-skcXsB_wziqLz89tbdgctwup',
  '1KUmQ-_1SGueIh91GTvKchxSOyRKrGngs',
  '1lPwnuvMFLLOkgvWYwT7K72vw55gBIL4D',
  '1og7gVb3Z-s7E6G0DrPeHTes24lgcg_kf',
  '1ORWuSz8EYcW3q2UCEruF0cSxrl8wfQf_',
  '1QgXtQTbcLDRiurjYDy38-npk9wfx4o_y',
  '1qVcyCfr02ImNYz1toGq-p5WGjvJeNtAi',
  '1qXWCoSmQ_PvaXGo8KZHSH56huivDuOI0',
  '1RIfV0T0VvmGXf3dcAgoLRXpV_qsKgdAw',
  '1s-4GJOjRo4RawfR3rq6vg8CrWL6C1AUF',
  '1SAlUkfag-p8C79AhXsgTNynBc6ijZ2q3',
  '1so4i3G6i9yk6ooXvCRk-RY2diDisRi50',
  '1T-YZRBeoh49UbLi1znMI_Qp0EmLYW-tS',
  '1T97X8ftPMPoho7lh9OWOj2eW7i12wqA0',
  '1UdUWo499eqaqqTCPGiZ_6lsPUCwiXA5a',
  '1UEXNsZGXdmMR2kTaKpZaLuZcnboOpzrI',
  '1UIqYuutEpJXtWg2xKnGFTSZApr_U6rQR',
  '1vhZMcDLDIjwpJPu6X4LjLVlhaOlw_34C',
  '1vqSv9C8gL6RrWmbWvO4CE66T2wUtRA4H',
  '1wEO_eKq8hXxB76jUCX0P5mrRdPT9gQ4r',
  '1whArJ0ZNlmkJm0xKud98roEIkmSClcIl',
  '1WY1NMbAsrH7pg8qiqJoJpPttfu1Skcss',
  '1YLz0ajOUKCtH5NokhPTQ8wlxTLnG_DJK',
  '1yvrvqyXSROxT63ZYCbjArCE3TYMavYz6',
  '1z_PPC3_xGWlckTMIMBgdu4lbdMnEQRTh',
  '1zJtpw7XIwecul0IxTq57aVmfskAMvhfz',
];

export const driveImageUrl = (id: string, size = 1024): string =>
  `https://lh3.googleusercontent.com/d/${id}=s${size}`;
