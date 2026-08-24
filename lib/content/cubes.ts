/**
 * O campo de cubos — GERADO por `node tools/build-cubes.cjs`. Não editar à mão.
 *
 * Cada unidade veio de onde ela está em `problem-section-reference.png`:
 * densidade, mistura de materiais e envelope espacial são decisões de design já
 * tomadas ali, e semeá-las com um gerador aleatório seria trocar a referência
 * por uma interpretação.
 *
 * COORDENADAS, no referencial do VÃO entre as metades — não em vw/vh. A
 * referência tem aspecto 1,50 e o alvo 1,78; transpor porcentagem entre os dois
 * deformaria o enxame.
 *
 *   u   −1..1 atravessando o vão            (0 = centro do vão)
 *   v   −1..1 atravessando a altura da peça (0 = centro das metades)
 *   s   lado do cubo, em meias-larguras de vão
 *
 * Referencial da medição: vão em x 750..1136, metades em y 292..765.
 *
 * 168 unidades — far 83 · mid 54 · near 31
 * materiais — bone 117 · sage 17 · navy 34
 *
 * O §9.3 do plano previa 34 unidades em três planos (12/14/8). A medição achou
 * mais: as contagens acima são as que a referência de fato tem.
 */

/** Plano de profundidade. Define parallax, desfoque e ordem de nascimento. */
export type CubePlane = 'far' | 'mid' | 'near';

/** As três famílias de material do §9.3. */
export type CubeMaterial = 'bone' | 'sage' | 'navy';

export type Cube = {
  u: number;
  v: number;
  s: number;
  m: CubeMaterial;
  p: CubePlane;
};

export const CUBES: readonly Cube[] = [
  { u: -0.9534, v: -1.1121, s: 0.0155, m: 'sage', p: 'far' },
  { u: -0.9223, v: -1.1121, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.8601, v: -1.1121, s: 0.0155, m: 'bone', p: 'far' },
  { u: -1.1036, v: -1.0973, s: 0.0881, m: 'bone', p: 'near' },
  { u: -0.9741, v: -1.0148, s: 0.0622, m: 'bone', p: 'mid' },
  { u: 0.4508, v: -0.9937, s: 0.0466, m: 'bone', p: 'mid' },
  { u: -0.7021, v: -0.9873, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.8575, v: -0.9831, s: 0.0725, m: 'bone', p: 'near' },
  { u: -0.6995, v: -0.9619, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.0259, v: -0.9387, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.6477, v: -0.9302, s: 0.0363, m: 'sage', p: 'mid' },
  { u: -0.2098, v: -0.926, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.9404, v: -0.8879, s: 0.1036, m: 'bone', p: 'near' },
  { u: -0.4741, v: -0.8879, s: 0.0622, m: 'sage', p: 'mid' },
  { u: -0.7876, v: -0.8858, s: 0.0363, m: 'bone', p: 'mid' },
  { u: -0.6995, v: -0.8647, s: 0.0155, m: 'navy', p: 'far' },
  { u: 1.0622, v: -0.8562, s: 0.3575, m: 'bone', p: 'near' },
  { u: -0.1218, v: -0.8351, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.7098, v: -0.8013, s: 0.1295, m: 'bone', p: 'near' },
  { u: -0.9223, v: -0.7886, s: 0.0155, m: 'navy', p: 'far' },
  { u: -0.4041, v: -0.7548, s: 0.0259, m: 'bone', p: 'mid' },
  { u: -0.9171, v: -0.7357, s: 0.0933, m: 'bone', p: 'near' },
  { u: 0.7254, v: -0.7336, s: 0.0259, m: 'bone', p: 'mid' },
  { u: -0.9585, v: -0.7082, s: 0.0155, m: 'navy', p: 'far' },
  { u: -0.8109, v: -0.6956, s: 0.0518, m: 'bone', p: 'mid' },
  { u: 0.7228, v: -0.6956, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.2953, v: -0.6596, s: 0.1036, m: 'bone', p: 'near' },
  { u: -0.6813, v: -0.6533, s: 0.0311, m: 'bone', p: 'mid' },
  { u: -0.5984, v: -0.649, s: 0.0829, m: 'bone', p: 'near' },
  { u: 0.728, v: -0.6448, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.5803, v: -0.6089, s: 0.0155, m: 'navy', p: 'far' },
  { u: -0.2927, v: -0.6047, s: 0.0415, m: 'bone', p: 'mid' },
  { u: 0.0648, v: -0.5877, s: 0.0311, m: 'bone', p: 'mid' },
  { u: -0.4067, v: -0.5349, s: 0.1295, m: 'navy', p: 'near' },
  { u: 0.8627, v: -0.5201, s: 0.0207, m: 'navy', p: 'far' },
  { u: 0.5674, v: -0.518, s: 0.0155, m: 'navy', p: 'far' },
  { u: 0.1192, v: -0.5159, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.6425, v: -0.5074, s: 0.1192, m: 'bone', p: 'near' },
  { u: -0.2306, v: -0.5053, s: 0.057, m: 'bone', p: 'mid' },
  { u: 0.2772, v: -0.4799, s: 0.057, m: 'bone', p: 'mid' },
  { u: 1.1062, v: -0.4693, s: 0.0415, m: 'navy', p: 'mid' },
  { u: 0.5259, v: -0.4545, s: 0.057, m: 'bone', p: 'mid' },
  { u: 0.1088, v: -0.4503, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.5544, v: -0.4313, s: 0.0259, m: 'bone', p: 'mid' },
  { u: -0.8187, v: -0.4207, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.9845, v: -0.4017, s: 0.0933, m: 'sage', p: 'near' },
  { u: -0.4378, v: -0.389, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.0233, v: -0.3869, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.2798, v: -0.3615, s: 0.0363, m: 'bone', p: 'mid' },
  { u: -0.6295, v: -0.3467, s: 0.0415, m: 'bone', p: 'mid' },
  { u: 0.3705, v: -0.3362, s: 0.1554, m: 'bone', p: 'near' },
  { u: -0.0544, v: -0.3066, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.443, v: -0.3044, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.728, v: -0.3023, s: 0.0207, m: 'navy', p: 'far' },
  { u: -0.9663, v: -0.3002, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.228, v: -0.2918, s: 0.0363, m: 'sage', p: 'mid' },
  { u: 0.8705, v: -0.277, s: 0.0155, m: 'navy', p: 'far' },
  { u: 0.4041, v: -0.2727, s: 0.0259, m: 'navy', p: 'mid' },
  { u: 1.1244, v: -0.2516, s: 0.0466, m: 'navy', p: 'mid' },
  { u: -0.3782, v: -0.2304, s: 0.057, m: 'bone', p: 'mid' },
  { u: -0.8886, v: -0.222, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.8627, v: -0.2199, s: 0.1244, m: 'bone', p: 'near' },
  { u: -0.0155, v: -0.1839, s: 0.0259, m: 'navy', p: 'mid' },
  { u: -0.7124, v: -0.1607, s: 0.0725, m: 'bone', p: 'near' },
  { u: 0.0363, v: -0.1543, s: 0.0259, m: 'navy', p: 'mid' },
  { u: -0.013, v: -0.1395, s: 0.0933, m: 'bone', p: 'near' },
  { u: 0.6606, v: -0.1374, s: 0.0725, m: 'bone', p: 'near' },
  { u: -0.4352, v: -0.1247, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.9819, v: -0.1226, s: 0.0311, m: 'sage', p: 'mid' },
  { u: 0.5518, v: -0.0951, s: 0.0415, m: 'navy', p: 'mid' },
  { u: 0.4326, v: -0.0825, s: 0.0518, m: 'bone', p: 'mid' },
  { u: 0.3187, v: -0.0698, s: 0.0311, m: 'bone', p: 'mid' },
  { u: -0.4301, v: -0.0613, s: 0.0259, m: 'navy', p: 'mid' },
  { u: -0.9715, v: -0.0592, s: 0.0207, m: 'sage', p: 'far' },
  { u: 0.8575, v: -0.0465, s: 0.0518, m: 'navy', p: 'mid' },
  { u: -0.6451, v: -0.0423, s: 0.1036, m: 'bone', p: 'near' },
  { u: -0.1762, v: -0.0359, s: 0.0155, m: 'sage', p: 'far' },
  { u: 0.8161, v: -0.0359, s: 0.0207, m: 'navy', p: 'far' },
  { u: -0.4301, v: -0.0338, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.3187, v: 0.0169, s: 0.0207, m: 'bone', p: 'far' },
  { u: 1.0699, v: 0.055, s: 0.0415, m: 'bone', p: 'mid' },
  { u: -0.5363, v: 0.0634, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.1969, v: 0.0677, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.4197, v: 0.0719, s: 0.114, m: 'sage', p: 'near' },
  { u: -0.7824, v: 0.0761, s: 0.1192, m: 'bone', p: 'near' },
  { u: -1.1373, v: 0.1078, s: 0.0259, m: 'bone', p: 'mid' },
  { u: -1.0207, v: 0.1311, s: 0.0674, m: 'bone', p: 'mid' },
  { u: -0.658, v: 0.186, s: 0.0466, m: 'sage', p: 'mid' },
  { u: 0.5829, v: 0.1882, s: 0.0207, m: 'navy', p: 'far' },
  { u: -0.171, v: 0.1924, s: 0.0155, m: 'navy', p: 'far' },
  { u: -0.1166, v: 0.2072, s: 0.1554, m: 'bone', p: 'near' },
  { u: 0.1528, v: 0.2072, s: 0.1554, m: 'bone', p: 'near' },
  { u: 0.1813, v: 0.2199, s: 0.0207, m: 'navy', p: 'far' },
  { u: 0.1192, v: 0.2283, s: 0.0415, m: 'navy', p: 'mid' },
  { u: 0.4689, v: 0.2283, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.5829, v: 0.2283, s: 0.0829, m: 'bone', p: 'near' },
  { u: 0.9508, v: 0.2283, s: 0.0415, m: 'bone', p: 'mid' },
  { u: -0.0829, v: 0.2304, s: 0.0466, m: 'navy', p: 'mid' },
  { u: 0.8212, v: 0.2304, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.5518, v: 0.3192, s: 0.0415, m: 'bone', p: 'mid' },
  { u: -0.8886, v: 0.3721, s: 0.0207, m: 'bone', p: 'far' },
  { u: -1.1425, v: 0.3742, s: 0.0155, m: 'navy', p: 'far' },
  { u: 1.0725, v: 0.4059, s: 0.0363, m: 'sage', p: 'mid' },
  { u: 0.8187, v: 0.408, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.5622, v: 0.4123, s: 0.0259, m: 'bone', p: 'mid' },
  { u: 0.4301, v: 0.4123, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.6632, v: 0.4123, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.1917, v: 0.4271, s: 0.0259, m: 'bone', p: 'mid' },
  { u: -0.8135, v: 0.4567, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.0699, v: 0.5307, s: 0.0207, m: 'bone', p: 'far' },
  { u: -1.101, v: 0.537, s: 0.0311, m: 'bone', p: 'mid' },
  { u: 0.2358, v: 0.5793, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.8964, v: 0.5814, s: 0.0363, m: 'bone', p: 'mid' },
  { u: -0.3394, v: 0.5814, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.5363, v: 0.5814, s: 0.0622, m: 'sage', p: 'mid' },
  { u: 0.6114, v: 0.5814, s: 0.0777, m: 'bone', p: 'near' },
  { u: 0.4508, v: 0.5835, s: 0.0674, m: 'sage', p: 'mid' },
  { u: 0.6788, v: 0.5877, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.5026, v: 0.592, s: 0.1658, m: 'bone', p: 'near' },
  { u: 0.715, v: 0.5941, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.8808, v: 0.611, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.7176, v: 0.6279, s: 0.0415, m: 'navy', p: 'mid' },
  { u: 0.7953, v: 0.6364, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.013, v: 0.6596, s: 0.0207, m: 'navy', p: 'far' },
  { u: -0.0984, v: 0.6617, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.2694, v: 0.6638, s: 0.0207, m: 'navy', p: 'far' },
  { u: 0.8238, v: 0.6638, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.842, v: 0.6956, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.0959, v: 0.7061, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.6192, v: 0.7146, s: 0.0207, m: 'sage', p: 'far' },
  { u: 0.2383, v: 0.7209, s: 0.0674, m: 'bone', p: 'mid' },
  { u: 0.8523, v: 0.7252, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.0959, v: 0.7315, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.6114, v: 0.7526, s: 0.1399, m: 'navy', p: 'near' },
  { u: 0.0699, v: 0.7548, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.8575, v: 0.7548, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.4119, v: 0.7569, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.3756, v: 0.7717, s: 0.0518, m: 'sage', p: 'mid' },
  { u: 0.2409, v: 0.7717, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.9585, v: 0.7738, s: 0.0363, m: 'sage', p: 'mid' },
  { u: 0.2435, v: 0.7949, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.1788, v: 0.8097, s: 0.0829, m: 'bone', p: 'near' },
  { u: -0.8575, v: 0.8224, s: 0.0207, m: 'navy', p: 'far' },
  { u: -0.8161, v: 0.8224, s: 0.0207, m: 'navy', p: 'far' },
  { u: 0.2565, v: 0.8224, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.9456, v: 0.8245, s: 0.114, m: 'navy', p: 'near' },
  { u: 0.8368, v: 0.8266, s: 0.0155, m: 'bone', p: 'far' },
  { u: -0.8808, v: 0.8351, s: 0.0259, m: 'navy', p: 'mid' },
  { u: 0.5285, v: 0.8414, s: 0.0155, m: 'navy', p: 'far' },
  { u: -0.3212, v: 0.8541, s: 0.0207, m: 'bone', p: 'far' },
  { u: 0.2953, v: 0.8668, s: 0.0155, m: 'bone', p: 'far' },
  { u: -1.0751, v: 0.8689, s: 0.3575, m: 'bone', p: 'near' },
  { u: 1.0777, v: 0.8689, s: 0.3368, m: 'bone', p: 'near' },
  { u: 0.7927, v: 0.8753, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.3212, v: 0.8837, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.3523, v: 0.8964, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.7617, v: 0.8964, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.5363, v: 0.9006, s: 0.0518, m: 'bone', p: 'mid' },
  { u: 0.4508, v: 0.9027, s: 0.057, m: 'bone', p: 'mid' },
  { u: 0.614, v: 0.9027, s: 0.0933, m: 'bone', p: 'near' },
  { u: 0.3886, v: 0.9049, s: 0.0155, m: 'bone', p: 'far' },
  { u: 0.7073, v: 0.9049, s: 0.0829, m: 'bone', p: 'near' },
  { u: 0.4948, v: 0.907, s: 0.0207, m: 'navy', p: 'far' },
  { u: -0.8187, v: 0.9218, s: 0.0363, m: 'bone', p: 'mid' },
  { u: -0.386, v: 0.9535, s: 0.0622, m: 'bone', p: 'mid' },
  { u: 0.3083, v: 0.9725, s: 0.0207, m: 'bone', p: 'far' },
  { u: -0.5285, v: 0.9873, s: 0.0155, m: 'sage', p: 'far' },
  { u: -0.8497, v: 0.9894, s: 0.0155, m: 'bone', p: 'far' },
];
