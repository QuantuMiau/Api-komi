// models/Carta.js
import { Schema, model } from "mongoose";

const cartaSchema = new Schema({
  texto: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
});

export default model("Carta", cartaSchema);