// @generated by protoc-gen-es v1.7.2 with parameter "target=ts"
// @generated from file message.proto (syntax proto3)
/* eslint-disable */
// @ts-nocheck

import type { BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage } from "@bufbuild/protobuf";
import { Message as Message$1, proto3, protoInt64 } from "@bufbuild/protobuf";
import { UserNameProof } from "./username_proof_pb.js";

/**
 * * Type of hashing scheme used to produce a digest of MessageData 
 *
 * @generated from enum HashScheme
 */
export enum HashScheme {
  /**
   * @generated from enum value: HASH_SCHEME_NONE = 0;
   */
  NONE = 0,

  /**
   * Default scheme for hashing MessageData
   *
   * @generated from enum value: HASH_SCHEME_BLAKE3 = 1;
   */
  BLAKE3 = 1,
}
// Retrieve enum metadata with: proto3.getEnumType(HashScheme)
proto3.util.setEnumType(HashScheme, "HashScheme", [
  { no: 0, name: "HASH_SCHEME_NONE" },
  { no: 1, name: "HASH_SCHEME_BLAKE3" },
]);

/**
 * * Type of signature scheme used to sign the Message hash  
 *
 * @generated from enum SignatureScheme
 */
export enum SignatureScheme {
  /**
   * @generated from enum value: SIGNATURE_SCHEME_NONE = 0;
   */
  NONE = 0,

  /**
   * Ed25519 signature (default)
   *
   * @generated from enum value: SIGNATURE_SCHEME_ED25519 = 1;
   */
  ED25519 = 1,

  /**
   * ECDSA signature using EIP-712 scheme
   *
   * @generated from enum value: SIGNATURE_SCHEME_EIP712 = 2;
   */
  EIP712 = 2,
}
// Retrieve enum metadata with: proto3.getEnumType(SignatureScheme)
proto3.util.setEnumType(SignatureScheme, "SignatureScheme", [
  { no: 0, name: "SIGNATURE_SCHEME_NONE" },
  { no: 1, name: "SIGNATURE_SCHEME_ED25519" },
  { no: 2, name: "SIGNATURE_SCHEME_EIP712" },
]);

/**
 * * Type of the MessageBody 
 *
 * @generated from enum MessageType
 */
export enum MessageType {
  /**
   * @generated from enum value: MESSAGE_TYPE_NONE = 0;
   */
  NONE = 0,

  /**
   * Add a new Cast
   *
   * @generated from enum value: MESSAGE_TYPE_CAST_ADD = 1;
   */
  CAST_ADD = 1,

  /**
   * Remove an existing Cast
   *
   * @generated from enum value: MESSAGE_TYPE_CAST_REMOVE = 2;
   */
  CAST_REMOVE = 2,

  /**
   * Add a Reaction to a Cast
   *
   * @generated from enum value: MESSAGE_TYPE_REACTION_ADD = 3;
   */
  REACTION_ADD = 3,

  /**
   * Remove a Reaction from a Cast
   *
   * @generated from enum value: MESSAGE_TYPE_REACTION_REMOVE = 4;
   */
  REACTION_REMOVE = 4,

  /**
   * Add a new Link
   *
   * @generated from enum value: MESSAGE_TYPE_LINK_ADD = 5;
   */
  LINK_ADD = 5,

  /**
   * Remove an existing Link
   *
   * @generated from enum value: MESSAGE_TYPE_LINK_REMOVE = 6;
   */
  LINK_REMOVE = 6,

  /**
   * Add a Verification of an Ethereum Address
   *
   * @generated from enum value: MESSAGE_TYPE_VERIFICATION_ADD_ETH_ADDRESS = 7;
   */
  VERIFICATION_ADD_ETH_ADDRESS = 7,

  /**
   * Remove a Verification
   *
   * @generated from enum value: MESSAGE_TYPE_VERIFICATION_REMOVE = 8;
   */
  VERIFICATION_REMOVE = 8,

  /**
   *  Deprecated
   *  MESSAGE_TYPE_SIGNER_ADD = 9; // Add a new Ed25519 key pair that signs messages for a user
   *  MESSAGE_TYPE_SIGNER_REMOVE = 10; // Remove an Ed25519 key pair that signs messages for a user
   *
   * Add metadata about a user
   *
   * @generated from enum value: MESSAGE_TYPE_USER_DATA_ADD = 11;
   */
  USER_DATA_ADD = 11,

  /**
   * Add or replace a username proof
   *
   * @generated from enum value: MESSAGE_TYPE_USERNAME_PROOF = 12;
   */
  USERNAME_PROOF = 12,

  /**
   * A Farcaster Frame action
   *
   * @generated from enum value: MESSAGE_TYPE_FRAME_ACTION = 13;
   */
  FRAME_ACTION = 13,
}
// Retrieve enum metadata with: proto3.getEnumType(MessageType)
proto3.util.setEnumType(MessageType, "MessageType", [
  { no: 0, name: "MESSAGE_TYPE_NONE" },
  { no: 1, name: "MESSAGE_TYPE_CAST_ADD" },
  { no: 2, name: "MESSAGE_TYPE_CAST_REMOVE" },
  { no: 3, name: "MESSAGE_TYPE_REACTION_ADD" },
  { no: 4, name: "MESSAGE_TYPE_REACTION_REMOVE" },
  { no: 5, name: "MESSAGE_TYPE_LINK_ADD" },
  { no: 6, name: "MESSAGE_TYPE_LINK_REMOVE" },
  { no: 7, name: "MESSAGE_TYPE_VERIFICATION_ADD_ETH_ADDRESS" },
  { no: 8, name: "MESSAGE_TYPE_VERIFICATION_REMOVE" },
  { no: 11, name: "MESSAGE_TYPE_USER_DATA_ADD" },
  { no: 12, name: "MESSAGE_TYPE_USERNAME_PROOF" },
  { no: 13, name: "MESSAGE_TYPE_FRAME_ACTION" },
]);

/**
 * * Farcaster network the message is intended for 
 *
 * @generated from enum FarcasterNetwork
 */
export enum FarcasterNetwork {
  /**
   * @generated from enum value: FARCASTER_NETWORK_NONE = 0;
   */
  NONE = 0,

  /**
   * Public primary network
   *
   * @generated from enum value: FARCASTER_NETWORK_MAINNET = 1;
   */
  MAINNET = 1,

  /**
   * Public test network
   *
   * @generated from enum value: FARCASTER_NETWORK_TESTNET = 2;
   */
  TESTNET = 2,

  /**
   * Private test network
   *
   * @generated from enum value: FARCASTER_NETWORK_DEVNET = 3;
   */
  DEVNET = 3,
}
// Retrieve enum metadata with: proto3.getEnumType(FarcasterNetwork)
proto3.util.setEnumType(FarcasterNetwork, "FarcasterNetwork", [
  { no: 0, name: "FARCASTER_NETWORK_NONE" },
  { no: 1, name: "FARCASTER_NETWORK_MAINNET" },
  { no: 2, name: "FARCASTER_NETWORK_TESTNET" },
  { no: 3, name: "FARCASTER_NETWORK_DEVNET" },
]);

/**
 * * Type of UserData 
 *
 * @generated from enum UserDataType
 */
export enum UserDataType {
  /**
   * @generated from enum value: USER_DATA_TYPE_NONE = 0;
   */
  NONE = 0,

  /**
   * Profile Picture for the user
   *
   * @generated from enum value: USER_DATA_TYPE_PFP = 1;
   */
  PFP = 1,

  /**
   * Display Name for the user
   *
   * @generated from enum value: USER_DATA_TYPE_DISPLAY = 2;
   */
  DISPLAY = 2,

  /**
   * Bio for the user
   *
   * @generated from enum value: USER_DATA_TYPE_BIO = 3;
   */
  BIO = 3,

  /**
   * URL of the user
   *
   * @generated from enum value: USER_DATA_TYPE_URL = 5;
   */
  URL = 5,

  /**
   * Preferred Name for the user
   *
   * @generated from enum value: USER_DATA_TYPE_USERNAME = 6;
   */
  USERNAME = 6,
}
// Retrieve enum metadata with: proto3.getEnumType(UserDataType)
proto3.util.setEnumType(UserDataType, "UserDataType", [
  { no: 0, name: "USER_DATA_TYPE_NONE" },
  { no: 1, name: "USER_DATA_TYPE_PFP" },
  { no: 2, name: "USER_DATA_TYPE_DISPLAY" },
  { no: 3, name: "USER_DATA_TYPE_BIO" },
  { no: 5, name: "USER_DATA_TYPE_URL" },
  { no: 6, name: "USER_DATA_TYPE_USERNAME" },
]);

/**
 * * Type of Reaction 
 *
 * @generated from enum ReactionType
 */
export enum ReactionType {
  /**
   * @generated from enum value: REACTION_TYPE_NONE = 0;
   */
  NONE = 0,

  /**
   * Like the target cast
   *
   * @generated from enum value: REACTION_TYPE_LIKE = 1;
   */
  LIKE = 1,

  /**
   * Share target cast to the user's audience
   *
   * @generated from enum value: REACTION_TYPE_RECAST = 2;
   */
  RECAST = 2,
}
// Retrieve enum metadata with: proto3.getEnumType(ReactionType)
proto3.util.setEnumType(ReactionType, "ReactionType", [
  { no: 0, name: "REACTION_TYPE_NONE" },
  { no: 1, name: "REACTION_TYPE_LIKE" },
  { no: 2, name: "REACTION_TYPE_RECAST" },
]);

/**
 * * Type of Protocol to disambiguate verification addresses 
 *
 * @generated from enum Protocol
 */
export enum Protocol {
  /**
   * @generated from enum value: PROTOCOL_ETHEREUM = 0;
   */
  ETHEREUM = 0,

  /**
   * @generated from enum value: PROTOCOL_SOLANA = 1;
   */
  SOLANA = 1,
}
// Retrieve enum metadata with: proto3.getEnumType(Protocol)
proto3.util.setEnumType(Protocol, "Protocol", [
  { no: 0, name: "PROTOCOL_ETHEREUM" },
  { no: 1, name: "PROTOCOL_SOLANA" },
]);

/**
 * *
 * A Message is a delta operation on the Farcaster network. The message protobuf is an envelope
 * that wraps a MessageData object and contains a hash and signature which can verify its authenticity.
 *
 * @generated from message Message
 */
export class Message extends Message$1<Message> {
  /**
   * Contents of the message
   *
   * @generated from field: MessageData data = 1;
   */
  data?: MessageData;

  /**
   * Hash digest of data
   *
   * @generated from field: bytes hash = 2;
   */
  hash = new Uint8Array(0);

  /**
   * Hash scheme that produced the hash digest
   *
   * @generated from field: HashScheme hash_scheme = 3;
   */
  hashScheme = HashScheme.NONE;

  /**
   * Signature of the hash digest
   *
   * @generated from field: bytes signature = 4;
   */
  signature = new Uint8Array(0);

  /**
   * Signature scheme that produced the signature
   *
   * @generated from field: SignatureScheme signature_scheme = 5;
   */
  signatureScheme = SignatureScheme.NONE;

  /**
   * Public key or address of the key pair that produced the signature
   *
   * @generated from field: bytes signer = 6;
   */
  signer = new Uint8Array(0);

  /**
   * MessageData serialized to bytes if using protobuf serialization other than ts-proto
   *
   * @generated from field: optional bytes data_bytes = 7;
   */
  dataBytes?: Uint8Array;

  constructor(data?: PartialMessage<Message>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "Message";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "data", kind: "message", T: MessageData },
    { no: 2, name: "hash", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 3, name: "hash_scheme", kind: "enum", T: proto3.getEnumType(HashScheme) },
    { no: 4, name: "signature", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 5, name: "signature_scheme", kind: "enum", T: proto3.getEnumType(SignatureScheme) },
    { no: 6, name: "signer", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 7, name: "data_bytes", kind: "scalar", T: 12 /* ScalarType.BYTES */, opt: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Message {
    return new Message().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Message {
    return new Message().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Message {
    return new Message().fromJsonString(jsonString, options);
  }

  static equals(a: Message | PlainMessage<Message> | undefined, b: Message | PlainMessage<Message> | undefined): boolean {
    return proto3.util.equals(Message, a, b);
  }
}

/**
 * *
 * A MessageData object contains properties common to all messages and wraps a body object which
 * contains properties specific to the MessageType.
 *
 * @generated from message MessageData
 */
export class MessageData extends Message$1<MessageData> {
  /**
   * Type of message contained in the body
   *
   * @generated from field: MessageType type = 1;
   */
  type = MessageType.NONE;

  /**
   * Farcaster ID of the user producing the message
   *
   * @generated from field: uint64 fid = 2;
   */
  fid = protoInt64.zero;

  /**
   * Farcaster epoch timestamp in seconds
   *
   * @generated from field: uint32 timestamp = 3;
   */
  timestamp = 0;

  /**
   * Farcaster network the message is intended for
   *
   * @generated from field: FarcasterNetwork network = 4;
   */
  network = FarcasterNetwork.NONE;

  /**
   * @generated from oneof MessageData.body
   */
  body: {
    /**
     * @generated from field: CastAddBody cast_add_body = 5;
     */
    value: CastAddBody;
    case: "castAddBody";
  } | {
    /**
     * @generated from field: CastRemoveBody cast_remove_body = 6;
     */
    value: CastRemoveBody;
    case: "castRemoveBody";
  } | {
    /**
     * @generated from field: ReactionBody reaction_body = 7;
     */
    value: ReactionBody;
    case: "reactionBody";
  } | {
    /**
     * @generated from field: VerificationAddAddressBody verification_add_address_body = 9;
     */
    value: VerificationAddAddressBody;
    case: "verificationAddAddressBody";
  } | {
    /**
     * @generated from field: VerificationRemoveBody verification_remove_body = 10;
     */
    value: VerificationRemoveBody;
    case: "verificationRemoveBody";
  } | {
    /**
     * SignerAddBody signer_add_body = 11; // Deprecated
     *
     * @generated from field: UserDataBody user_data_body = 12;
     */
    value: UserDataBody;
    case: "userDataBody";
  } | {
    /**
     * SignerRemoveBody signer_remove_body = 13; // Deprecated
     *
     * @generated from field: LinkBody link_body = 14;
     */
    value: LinkBody;
    case: "linkBody";
  } | {
    /**
     * @generated from field: UserNameProof username_proof_body = 15;
     */
    value: UserNameProof;
    case: "usernameProofBody";
  } | {
    /**
     * @generated from field: FrameActionBody frame_action_body = 16;
     */
    value: FrameActionBody;
    case: "frameActionBody";
  } | { case: undefined; value?: undefined } = { case: undefined };

  constructor(data?: PartialMessage<MessageData>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "MessageData";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "type", kind: "enum", T: proto3.getEnumType(MessageType) },
    { no: 2, name: "fid", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
    { no: 3, name: "timestamp", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 4, name: "network", kind: "enum", T: proto3.getEnumType(FarcasterNetwork) },
    { no: 5, name: "cast_add_body", kind: "message", T: CastAddBody, oneof: "body" },
    { no: 6, name: "cast_remove_body", kind: "message", T: CastRemoveBody, oneof: "body" },
    { no: 7, name: "reaction_body", kind: "message", T: ReactionBody, oneof: "body" },
    { no: 9, name: "verification_add_address_body", kind: "message", T: VerificationAddAddressBody, oneof: "body" },
    { no: 10, name: "verification_remove_body", kind: "message", T: VerificationRemoveBody, oneof: "body" },
    { no: 12, name: "user_data_body", kind: "message", T: UserDataBody, oneof: "body" },
    { no: 14, name: "link_body", kind: "message", T: LinkBody, oneof: "body" },
    { no: 15, name: "username_proof_body", kind: "message", T: UserNameProof, oneof: "body" },
    { no: 16, name: "frame_action_body", kind: "message", T: FrameActionBody, oneof: "body" },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): MessageData {
    return new MessageData().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): MessageData {
    return new MessageData().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): MessageData {
    return new MessageData().fromJsonString(jsonString, options);
  }

  static equals(a: MessageData | PlainMessage<MessageData> | undefined, b: MessageData | PlainMessage<MessageData> | undefined): boolean {
    return proto3.util.equals(MessageData, a, b);
  }
}

/**
 * * Adds metadata about a user 
 *
 * @generated from message UserDataBody
 */
export class UserDataBody extends Message$1<UserDataBody> {
  /**
   * Type of metadata
   *
   * @generated from field: UserDataType type = 1;
   */
  type = UserDataType.NONE;

  /**
   * Value of the metadata
   *
   * @generated from field: string value = 2;
   */
  value = "";

  constructor(data?: PartialMessage<UserDataBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "UserDataBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "type", kind: "enum", T: proto3.getEnumType(UserDataType) },
    { no: 2, name: "value", kind: "scalar", T: 9 /* ScalarType.STRING */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): UserDataBody {
    return new UserDataBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): UserDataBody {
    return new UserDataBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): UserDataBody {
    return new UserDataBody().fromJsonString(jsonString, options);
  }

  static equals(a: UserDataBody | PlainMessage<UserDataBody> | undefined, b: UserDataBody | PlainMessage<UserDataBody> | undefined): boolean {
    return proto3.util.equals(UserDataBody, a, b);
  }
}

/**
 * @generated from message Embed
 */
export class Embed extends Message$1<Embed> {
  /**
   * @generated from oneof Embed.embed
   */
  embed: {
    /**
     * @generated from field: string url = 1;
     */
    value: string;
    case: "url";
  } | {
    /**
     * @generated from field: CastId cast_id = 2;
     */
    value: CastId;
    case: "castId";
  } | { case: undefined; value?: undefined } = { case: undefined };

  constructor(data?: PartialMessage<Embed>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "Embed";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "url", kind: "scalar", T: 9 /* ScalarType.STRING */, oneof: "embed" },
    { no: 2, name: "cast_id", kind: "message", T: CastId, oneof: "embed" },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Embed {
    return new Embed().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Embed {
    return new Embed().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Embed {
    return new Embed().fromJsonString(jsonString, options);
  }

  static equals(a: Embed | PlainMessage<Embed> | undefined, b: Embed | PlainMessage<Embed> | undefined): boolean {
    return proto3.util.equals(Embed, a, b);
  }
}

/**
 * * Adds a new Cast 
 *
 * @generated from message CastAddBody
 */
export class CastAddBody extends Message$1<CastAddBody> {
  /**
   * URLs to be embedded in the cast
   *
   * @generated from field: repeated string embeds_deprecated = 1;
   */
  embedsDeprecated: string[] = [];

  /**
   * Fids mentioned in the cast
   *
   * @generated from field: repeated uint64 mentions = 2;
   */
  mentions: bigint[] = [];

  /**
   * @generated from oneof CastAddBody.parent
   */
  parent: {
    /**
     * Parent cast of the cast
     *
     * @generated from field: CastId parent_cast_id = 3;
     */
    value: CastId;
    case: "parentCastId";
  } | {
    /**
     * Parent URL
     *
     * @generated from field: string parent_url = 7;
     */
    value: string;
    case: "parentUrl";
  } | { case: undefined; value?: undefined } = { case: undefined };

  /**
   * Text of the cast
   *
   * @generated from field: string text = 4;
   */
  text = "";

  /**
   * Positions of the mentions in the text
   *
   * @generated from field: repeated uint32 mentions_positions = 5;
   */
  mentionsPositions: number[] = [];

  /**
   * URLs or cast ids to be embedded in the cast
   *
   * @generated from field: repeated Embed embeds = 6;
   */
  embeds: Embed[] = [];

  constructor(data?: PartialMessage<CastAddBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "CastAddBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "embeds_deprecated", kind: "scalar", T: 9 /* ScalarType.STRING */, repeated: true },
    { no: 2, name: "mentions", kind: "scalar", T: 4 /* ScalarType.UINT64 */, repeated: true },
    { no: 3, name: "parent_cast_id", kind: "message", T: CastId, oneof: "parent" },
    { no: 7, name: "parent_url", kind: "scalar", T: 9 /* ScalarType.STRING */, oneof: "parent" },
    { no: 4, name: "text", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 5, name: "mentions_positions", kind: "scalar", T: 13 /* ScalarType.UINT32 */, repeated: true },
    { no: 6, name: "embeds", kind: "message", T: Embed, repeated: true },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CastAddBody {
    return new CastAddBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CastAddBody {
    return new CastAddBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CastAddBody {
    return new CastAddBody().fromJsonString(jsonString, options);
  }

  static equals(a: CastAddBody | PlainMessage<CastAddBody> | undefined, b: CastAddBody | PlainMessage<CastAddBody> | undefined): boolean {
    return proto3.util.equals(CastAddBody, a, b);
  }
}

/**
 * * Removes an existing Cast 
 *
 * @generated from message CastRemoveBody
 */
export class CastRemoveBody extends Message$1<CastRemoveBody> {
  /**
   * Hash of the cast to remove
   *
   * @generated from field: bytes target_hash = 1;
   */
  targetHash = new Uint8Array(0);

  constructor(data?: PartialMessage<CastRemoveBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "CastRemoveBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "target_hash", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CastRemoveBody {
    return new CastRemoveBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CastRemoveBody {
    return new CastRemoveBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CastRemoveBody {
    return new CastRemoveBody().fromJsonString(jsonString, options);
  }

  static equals(a: CastRemoveBody | PlainMessage<CastRemoveBody> | undefined, b: CastRemoveBody | PlainMessage<CastRemoveBody> | undefined): boolean {
    return proto3.util.equals(CastRemoveBody, a, b);
  }
}

/**
 * * Identifier used to look up a Cast 
 *
 * @generated from message CastId
 */
export class CastId extends Message$1<CastId> {
  /**
   * Fid of the user who created the cast
   *
   * @generated from field: uint64 fid = 1;
   */
  fid = protoInt64.zero;

  /**
   * Hash of the cast
   *
   * @generated from field: bytes hash = 2;
   */
  hash = new Uint8Array(0);

  constructor(data?: PartialMessage<CastId>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "CastId";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "fid", kind: "scalar", T: 4 /* ScalarType.UINT64 */ },
    { no: 2, name: "hash", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): CastId {
    return new CastId().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): CastId {
    return new CastId().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): CastId {
    return new CastId().fromJsonString(jsonString, options);
  }

  static equals(a: CastId | PlainMessage<CastId> | undefined, b: CastId | PlainMessage<CastId> | undefined): boolean {
    return proto3.util.equals(CastId, a, b);
  }
}

/**
 * * Adds or removes a Reaction from a Cast 
 *
 * @generated from message ReactionBody
 */
export class ReactionBody extends Message$1<ReactionBody> {
  /**
   * Type of reaction
   *
   * @generated from field: ReactionType type = 1;
   */
  type = ReactionType.NONE;

  /**
   * @generated from oneof ReactionBody.target
   */
  target: {
    /**
     * CastId of the Cast to react to
     *
     * @generated from field: CastId target_cast_id = 2;
     */
    value: CastId;
    case: "targetCastId";
  } | {
    /**
     * URL to react to
     *
     * @generated from field: string target_url = 3;
     */
    value: string;
    case: "targetUrl";
  } | { case: undefined; value?: undefined } = { case: undefined };

  constructor(data?: PartialMessage<ReactionBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "ReactionBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "type", kind: "enum", T: proto3.getEnumType(ReactionType) },
    { no: 2, name: "target_cast_id", kind: "message", T: CastId, oneof: "target" },
    { no: 3, name: "target_url", kind: "scalar", T: 9 /* ScalarType.STRING */, oneof: "target" },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): ReactionBody {
    return new ReactionBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): ReactionBody {
    return new ReactionBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): ReactionBody {
    return new ReactionBody().fromJsonString(jsonString, options);
  }

  static equals(a: ReactionBody | PlainMessage<ReactionBody> | undefined, b: ReactionBody | PlainMessage<ReactionBody> | undefined): boolean {
    return proto3.util.equals(ReactionBody, a, b);
  }
}

/**
 * * Adds a Verification of ownership of an Address based on Protocol 
 *
 * @generated from message VerificationAddAddressBody
 */
export class VerificationAddAddressBody extends Message$1<VerificationAddAddressBody> {
  /**
   * Address being verified for a given Protocol
   *
   * @generated from field: bytes address = 1;
   */
  address = new Uint8Array(0);

  /**
   * Signature produced by the user's address for a given Protocol
   *
   * @generated from field: bytes claim_signature = 2;
   */
  claimSignature = new Uint8Array(0);

  /**
   * Hash of the latest Ethereum block when the signature was produced
   *
   * @generated from field: bytes block_hash = 3;
   */
  blockHash = new Uint8Array(0);

  /**
   * Type of verification. 0 = EOA, 1 = contract
   *
   * @generated from field: uint32 verification_type = 4;
   */
  verificationType = 0;

  /**
   * 0 for EOA verifications, 1 or 10 for contract verifications
   *
   * @generated from field: uint32 chain_id = 5;
   */
  chainId = 0;

  /**
   * Protocol of the Verification
   *
   * @generated from field: Protocol protocol = 7;
   */
  protocol = Protocol.ETHEREUM;

  constructor(data?: PartialMessage<VerificationAddAddressBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "VerificationAddAddressBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "address", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 2, name: "claim_signature", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 3, name: "block_hash", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 4, name: "verification_type", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 5, name: "chain_id", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 7, name: "protocol", kind: "enum", T: proto3.getEnumType(Protocol) },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): VerificationAddAddressBody {
    return new VerificationAddAddressBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): VerificationAddAddressBody {
    return new VerificationAddAddressBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): VerificationAddAddressBody {
    return new VerificationAddAddressBody().fromJsonString(jsonString, options);
  }

  static equals(a: VerificationAddAddressBody | PlainMessage<VerificationAddAddressBody> | undefined, b: VerificationAddAddressBody | PlainMessage<VerificationAddAddressBody> | undefined): boolean {
    return proto3.util.equals(VerificationAddAddressBody, a, b);
  }
}

/**
 * * Removes a Verification of a given protocol 
 *
 * @generated from message VerificationRemoveBody
 */
export class VerificationRemoveBody extends Message$1<VerificationRemoveBody> {
  /**
   * Address of the Verification to remove
   *
   * @generated from field: bytes address = 1;
   */
  address = new Uint8Array(0);

  /**
   * Protocol of the Verification to remove
   *
   * @generated from field: Protocol protocol = 2;
   */
  protocol = Protocol.ETHEREUM;

  constructor(data?: PartialMessage<VerificationRemoveBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "VerificationRemoveBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "address", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 2, name: "protocol", kind: "enum", T: proto3.getEnumType(Protocol) },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): VerificationRemoveBody {
    return new VerificationRemoveBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): VerificationRemoveBody {
    return new VerificationRemoveBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): VerificationRemoveBody {
    return new VerificationRemoveBody().fromJsonString(jsonString, options);
  }

  static equals(a: VerificationRemoveBody | PlainMessage<VerificationRemoveBody> | undefined, b: VerificationRemoveBody | PlainMessage<VerificationRemoveBody> | undefined): boolean {
    return proto3.util.equals(VerificationRemoveBody, a, b);
  }
}

/**
 * * Adds or removes a Link 
 *
 * @generated from message LinkBody
 */
export class LinkBody extends Message$1<LinkBody> {
  /**
   * Type of link, <= 8 characters
   *
   * @generated from field: string type = 1;
   */
  type = "";

  /**
   * User-defined timestamp that preserves original timestamp when message.data.timestamp needs to be updated for compaction
   *
   * @generated from field: optional uint32 displayTimestamp = 2;
   */
  displayTimestamp?: number;

  /**
   * @generated from oneof LinkBody.target
   */
  target: {
    /**
     * The fid the link relates to
     *
     * @generated from field: uint64 target_fid = 3;
     */
    value: bigint;
    case: "targetFid";
  } | { case: undefined; value?: undefined } = { case: undefined };

  constructor(data?: PartialMessage<LinkBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "LinkBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "type", kind: "scalar", T: 9 /* ScalarType.STRING */ },
    { no: 2, name: "displayTimestamp", kind: "scalar", T: 13 /* ScalarType.UINT32 */, opt: true },
    { no: 3, name: "target_fid", kind: "scalar", T: 4 /* ScalarType.UINT64 */, oneof: "target" },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): LinkBody {
    return new LinkBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): LinkBody {
    return new LinkBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): LinkBody {
    return new LinkBody().fromJsonString(jsonString, options);
  }

  static equals(a: LinkBody | PlainMessage<LinkBody> | undefined, b: LinkBody | PlainMessage<LinkBody> | undefined): boolean {
    return proto3.util.equals(LinkBody, a, b);
  }
}

/**
 * * A Farcaster Frame action 
 *
 * @generated from message FrameActionBody
 */
export class FrameActionBody extends Message$1<FrameActionBody> {
  /**
   * URL of the Frame triggering the action
   *
   * @generated from field: bytes url = 1;
   */
  url = new Uint8Array(0);

  /**
   * The index of the button pressed (1-4)
   *
   * @generated from field: uint32 button_index = 2;
   */
  buttonIndex = 0;

  /**
   * The cast which contained the frame url
   *
   * @generated from field: CastId cast_id = 3;
   */
  castId?: CastId;

  /**
   * Text input from the user, if present
   *
   * @generated from field: bytes input_text = 4;
   */
  inputText = new Uint8Array(0);

  /**
   * Serialized frame state value
   *
   * @generated from field: bytes state = 5;
   */
  state = new Uint8Array(0);

  /**
   * Chain-specific transaction ID for tx actions
   *
   * @generated from field: bytes transaction_id = 6;
   */
  transactionId = new Uint8Array(0);

  constructor(data?: PartialMessage<FrameActionBody>) {
    super();
    proto3.util.initPartial(data, this);
  }

  static readonly runtime: typeof proto3 = proto3;
  static readonly typeName = "FrameActionBody";
  static readonly fields: FieldList = proto3.util.newFieldList(() => [
    { no: 1, name: "url", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 2, name: "button_index", kind: "scalar", T: 13 /* ScalarType.UINT32 */ },
    { no: 3, name: "cast_id", kind: "message", T: CastId },
    { no: 4, name: "input_text", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 5, name: "state", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
    { no: 6, name: "transaction_id", kind: "scalar", T: 12 /* ScalarType.BYTES */ },
  ]);

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): FrameActionBody {
    return new FrameActionBody().fromBinary(bytes, options);
  }

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): FrameActionBody {
    return new FrameActionBody().fromJson(jsonValue, options);
  }

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): FrameActionBody {
    return new FrameActionBody().fromJsonString(jsonString, options);
  }

  static equals(a: FrameActionBody | PlainMessage<FrameActionBody> | undefined, b: FrameActionBody | PlainMessage<FrameActionBody> | undefined): boolean {
    return proto3.util.equals(FrameActionBody, a, b);
  }
}

