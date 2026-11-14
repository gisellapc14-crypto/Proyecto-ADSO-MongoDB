// Importamos las librerías necesarias
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt"); // Librería para encriptar contraseñas
const jwt = require('jsonwebtoken');
const { autenticar } = require('../middlewares/autenticacion');

// Ruta de registro de usuario
router.post("/registrese", async (req, res) => {
    try {
        const { name, email, password, born, phone } = req.body;

        if (!name || !email || !password || !born || !phone) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const emailNormalizado = email.toLowerCase().trim();
        const usuarioExistente = await User.findOne({ email: emailNormalizado });
        if (usuarioExistente) {
            return res.status(409).json({ error: "Ya existe una cuenta con este correo" });
        }

        // Encriptamos la contraseña antes de guardarla
        // El número 10 es el "costo" del encriptado (mientras más alto, más seguro pero más lento)
        const passwordEncriptada = await bcrypt.hash(password, 10);

        // Creamos el usuario con la contraseña ya encriptada, no la original
        const newUser = new User({
            name,
            email: emailNormalizado,
            password: passwordEncriptada,
            born,
            phone,
            role: 'cliente'
        });

        await newUser.save();

        res.status(201).json({
            message: "Usuario guardado correctamente"
        });
    } catch (error) {
        console.error('Error al registrar usuario:', error.message);
        res.status(500).json({
            error: "Error al guardar usuario"
        });
    }
});

// Ruta de login
router.post("/login", async (req, res) => {
    try {
        const { usuario, password } = req.body;

        // Buscamos el usuario por email o nombre
        const user = await User.findOne({
            $or: [{ email: usuario }, { name: usuario }]
        });

        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Comparamos la contraseña escrita con la encriptada guardada en la BD
        // bcrypt.compare la desencripta internamente para comparar, nunca la revela
        const passwordCorrecta = await bcrypt.compare(password, user.password);

        if (!passwordCorrecta) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        // Nunca enviamos el hash de la contraseña al cliente, ni siquiera después
        // de una autenticación correcta.
        const usuarioSeguro = {
            id: user._id,
            name: user.name,
            email: user.email,
            born: user.born,
            phone: user.phone,
            fotoPerfil: user.fotoPerfil || '',
            role: user.role || 'cliente'
        };

        const token = jwt.sign(
            { id: user._id.toString(), role: usuarioSeguro.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({ message: "Login exitoso", token, user: usuarioSeguro });
    } catch (error) {
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});

router.get('/perfil', autenticar, (req, res) => {
    res.json({
        id: req.usuario._id,
        name: req.usuario.name,
        email: req.usuario.email,
        born: req.usuario.born,
        phone: req.usuario.phone,
        fotoPerfil: req.usuario.fotoPerfil || '',
        role: req.usuario.role || 'cliente'
    });
});

router.put('/perfil', autenticar, async (req, res) => {
    try {
        const { name, born, phone, fotoPerfil } = req.body;
        const nombre = String(name || '').trim();
        const nacimiento = String(born || '').trim();
        const telefono = String(phone || '').trim();

        if (nombre.length < 2 || nombre.length > 80 || !nacimiento || nacimiento.length > 60 || telefono.length < 7 || telefono.length > 30) {
            return res.status(400).json({ error: 'Verifica tu nombre, fecha de nacimiento y teléfono.' });
        }

        const foto = fotoPerfil === undefined ? req.usuario.fotoPerfil || '' : String(fotoPerfil || '');
        const esFotoValida = !foto || /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(foto);
        if (!esFotoValida || foto.length > 750000) {
            return res.status(400).json({ error: 'La foto debe ser PNG, JPG o WEBP y tener un tamaño reducido.' });
        }

        const usuario = await User.findByIdAndUpdate(
            req.usuario._id,
            { name: nombre, born: nacimiento, phone: telefono, fotoPerfil: foto },
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Tu perfil fue actualizado correctamente.',
            user: {
                id: usuario._id,
                name: usuario.name,
                email: usuario.email,
                born: usuario.born,
                phone: usuario.phone,
                fotoPerfil: usuario.fotoPerfil || '',
                role: usuario.role || 'cliente'
            }
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error.message);
        res.status(500).json({ error: 'No se pudo actualizar tu perfil.' });
    }
});

module.exports = router;
