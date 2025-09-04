// Viatic-server/viaticosRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Viatico = require('./viaticoModel');

const router = express.Router();

function verifyToken(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded._id || decoded.userId; // ajusta según tu payload
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// POST /api/viaticos  (crear)
router.post('/', verifyToken, async (req, res) => {
  try {
    // Quitar 'mensaje' del body para NO persistirlo
    const { mensaje, ...data } = req.body;

    // Desestructurar lo que sí usamos
    const {
      // comunes
      tipo, nombre, fechaGasto, motivoGasto, cr, sucursal, folio, observaciones, tipoServicio,
      // gasolina
      origen, destino, kmInicial, kmFinal, km,
      // viáticos
      montoComprobar,
    } = data;

    // Validación mínima común
    const baseReq = [tipo, nombre, fechaGasto, motivoGasto, cr, sucursal, folio, tipoServicio];
    if (baseReq.some(v => v === undefined || v === null || String(v).trim() === '')) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    // Crear documento sin 'mensaje'
    const doc = new Viatico({
      ...data,
      fechaGasto: fechaGasto ? new Date(fechaGasto) : undefined,
      createdBy: req.userId,
    });

    // Reglas por tipo
    if (tipo === 'gasolina') {
      if (
        [origen, destino].some(v => !v || String(v).trim() === '') ||
        kmInicial === undefined || kmFinal === undefined
      ) {
        return res.status(400).json({ message: 'Faltan campos de gasolina: origen, destino, kmInicial, kmFinal' });
      }
      const calcKm = Number(kmFinal) - Number(kmInicial);
      doc.km = Number.isFinite(Number(km)) ? Number(km) : calcKm;
      if (!Number.isFinite(doc.km) || doc.km < 0) {
        return res.status(400).json({ message: 'KM inválido (final debe ser >= inicial)' });
      }
    } else if (tipo === 'viaticos') {
      if (montoComprobar === undefined || String(montoComprobar) === '') {
        return res.status(400).json({ message: 'Falta monto a comprobar' });
      }
    } else {
      return res.status(400).json({ message: 'Tipo no soportado' });
    }

    const saved = await doc.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('Error creando viático:', err);
    return res.status(500).json({ message: 'Error guardando viático', error: err.message });
  }
});

// GET /api/viaticos  (lista del usuario autenticado)
router.get('/', verifyToken, async (req, res) => {
  try {
    const items = await Viatico
      .find({ createdBy: req.userId })
      .select('-mensaje') // oculta 'mensaje' si existiera en docs antiguos
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Error listando viáticos', error: err.message });
  }
});

// GET /api/viaticos/:id  (ver uno)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const it = await Viatico.findOne({ _id: req.params.id, createdBy: req.userId }).select('-mensaje');
    if (!it) return res.status(404).json({ message: 'No encontrado' });
    res.json(it);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo viático', error: err.message });
  }
});

// PUT /api/viaticos/:id  (editar)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { mensaje, createdBy, ...data } = req.body; // no permitimos mensaje/createdBy

    // Validación mínima
    const {
      tipo, nombre, fechaGasto, motivoGasto, cr, sucursal, folio, tipoServicio,
      origen, destino, kmInicial, kmFinal, km, montoComprobar,
    } = data;

    const baseReq = [tipo, nombre, fechaGasto, motivoGasto, cr, sucursal, folio, tipoServicio];
    if (baseReq.some(v => v === undefined || v === null || String(v).trim() === '')) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const doc = await Viatico.findOne({ _id: req.params.id, createdBy: req.userId });
    if (!doc) return res.status(404).json({ message: 'No encontrado' });

    // Asignar campos
    Object.assign(doc, data);
    doc.fechaGasto = fechaGasto ? new Date(fechaGasto) : doc.fechaGasto;

    if (tipo === 'gasolina') {
      if ([origen, destino].some(v => !v || String(v).trim() === '') ||
          kmInicial === undefined || kmFinal === undefined) {
        return res.status(400).json({ message: 'Faltan campos de gasolina: origen, destino, kmInicial, kmFinal' });
      }
      const calcKm = Number(kmFinal) - Number(kmInicial);
      doc.km = Number.isFinite(Number(km)) ? Number(km) : calcKm;
      if (!Number.isFinite(doc.km) || doc.km < 0) {
        return res.status(400).json({ message: 'KM inválido (final debe ser >= inicial)' });
      }
    } else if (tipo === 'viaticos') {
      if (montoComprobar === undefined || String(montoComprobar) === '') {
        return res.status(400).json({ message: 'Falta monto a comprobar' });
      }
      // limpiar campos exclusivos de gasolina
      doc.origen = doc.destino = undefined;
      doc.kmInicial = doc.kmFinal = doc.km = undefined;
    } else {
      return res.status(400).json({ message: 'Tipo no soportado' });
    }

    const saved = await doc.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Error actualizando viático', error: err.message });
  }
});

// DELETE /api/viaticos/:id  (eliminar)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const del = await Viatico.findOneAndDelete({ _id: req.params.id, createdBy: req.userId });
    if (!del) return res.status(404).json({ message: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Error eliminando viático', error: err.message });
  }
});


module.exports = router;
