import {
  type APIInteractionResponseChannelMessageWithSource,
  ApplicationCommandType,
  InteractionResponseType,
  type APIApplicationCommandInteraction,
} from "discord-api-types/v10"
import { HTTPException } from "hono/http-exception"
import { postIdMap } from "../utils/post-id-map"
import { adminUserIdMap } from "../utils/admin-user-id-map"
import { errors } from "../utils/errors"
import type { Env } from "~/worker-configuration"

export async function handleCheckPostCommand(
  interaction: APIApplicationCommandInteraction,
  env: Env,
) {
  const payload = interaction.data

  if (payload.type !== ApplicationCommandType.ChatInput) {
    throw new HTTPException(500)
  }

  if (payload.name !== "check") {
    throw new HTTPException(500)
  }

  const titleObject = payload.options?.find((item) => item.name === "title")

  const titleValue =
    titleObject && "value" in titleObject ? titleObject.value : null

  const postId = postIdMap.get(interaction.channel.id)

  const post = await env.API.readPost({ postId: postId })

  if (post instanceof HTTPException) {
    throw post
  }

  // TODO: D1で書き直す！
  const adminUserId = adminUserIdMap.get(interaction.channel.id)

  if (adminUserId !== interaction.member?.user.id) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: errors.noPermission,
      },
    }
  }

  if (titleValue !== post.name) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: errors.postNotFound,
      },
    }
  }

  if (post === undefined) {
    // throw new HTTPException(500, { message: "Post not found" })
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: errors.postNotFound,
      },
    }
  }

  if (post.isClosed) {
    // throw new HTTPException(500, { message: "Post is closed" })
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: errors.postIsClosed,
      },
    }
  }

  if (post.isDeleted) {
    // throw new HTTPException(500, { message: "Post is deleted" })
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: errors.postNotFound,
      },
    }
  }

  let currentVoteResults = `「${post.name}」の現在の投票数は以下の通りです。\n`
  for (let index = 0; index < post.options.length; index++) {
    currentVoteResults += `${index + 1}.${post.options[index].name} (${post.options[index].count}票)\n`
  }

  // やること！！！！！: 投票を受け付けたメッセージを本人のみに表示する
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: currentVoteResults,
    },
  } satisfies APIInteractionResponseChannelMessageWithSource
}
